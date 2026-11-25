import uuid
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.log import User, Agent, Conversation, Message, GuardrailAuditLog, SecurityAlert
from app.services.guardrail_service import GuardrailService
from app.services.output_guardrail import output_guardrail
from app.services.ai_provider_service import ai_provider_service
from app.schemas.request import GuardrailCheckRequest
from app.core.constants import Decision, Severity
from app.utils.logger import logger

class ChatService:
    """
    Centralized End-to-End AI Agent Chat & Guardrail Security Orchestrator.
    """

    def __init__(self, guardrail_service: Optional[GuardrailService] = None):
        self.guardrail_service = guardrail_service or GuardrailService()
        self.ai_provider = ai_provider_service

    def process_chat_message(
        self,
        db: Session,
        user: User,
        agent_id: str,
        message_text: str,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        start_time = time.perf_counter()

        # 1. Validate Target Agent (Must exist, be enabled, and not disconnected)
        agent = db.query(Agent).filter((Agent.id == agent_id) | (Agent.slug == agent_id)).first()
        if not agent or agent.status == "Disconnected" or agent.enabled is False:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This AI agent is currently unavailable or disabled."
            )

        # 2. Get or Create Conversation (strictly validated for authenticated user)
        conv = None
        if conversation_id:
            conv = db.query(Conversation).filter(
                Conversation.id == conversation_id,
                Conversation.user_id == user.id
            ).first()
            if not conv:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or unauthorized."
                )

        if not conv:
            # Generate a meaningful title from prompt
            prompt_summary = message_text.strip()[:40] + ("..." if len(message_text) > 40 else "")
            conv = Conversation(
                id=conversation_id or f"conv-{uuid.uuid4().hex[:12]}",
                user_id=user.id,
                agent_id=agent.id,
                title=prompt_summary or f"Chat with {agent.name}"
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)

        # 3. Run Input Guardrail Inspection (Ensemble: Modular Rules + ML Classifier)
        guardrail_req = GuardrailCheckRequest(
            agent_id=agent.id,
            request=message_text,
            context={"user_id": user.id, "conversation_id": conv.id}
        )
        guardrail_result = self.guardrail_service.check_request(guardrail_req)

        decision_str = guardrail_result.decision.value if hasattr(guardrail_result.decision, "value") else str(guardrail_result.decision)
        risk_score = round(float(guardrail_result.risk_score), 4)
        risk_level = guardrail_result.severity.value if hasattr(guardrail_result.severity, "value") else str(guardrail_result.severity)

        triggered_rules_list = []
        if guardrail_result.indicators:
            for ind in guardrail_result.indicators:
                if hasattr(ind, "indicator_type"):
                    triggered_rules_list.append(ind.indicator_type)
                elif isinstance(ind, dict) and "indicator_type" in ind:
                    triggered_rules_list.append(ind["indicator_type"])
                else:
                    triggered_rules_list.append(str(ind))
        ml_score = guardrail_result.model_score

        # 4. Save User Message to Database
        user_msg = Message(
            id=f"msg-{uuid.uuid4().hex[:12]}",
            conversation_id=conv.id,
            sender="user",
            content=message_text,
            risk_score=risk_score,
            risk_level=risk_level,
            decision=decision_str,
            detection_reason=guardrail_result.explanation,
            triggered_rules=triggered_rules_list,
            ml_score=ml_score
        )
        db.add(user_msg)
        conv.updated_at = datetime.now(timezone.utc)
        db.commit()

        # Update guardrail audit log with conversation_id & user_id
        try:
            audit_log = db.query(GuardrailAuditLog).filter(GuardrailAuditLog.id == guardrail_result.request_id).first()
            if audit_log:
                audit_log.user_id = user.id
                audit_log.conversation_id = conv.id
                db.commit()
        except Exception:
            pass

        # 5. Handle Decision
        # IF BLOCK: Do NOT forward to AI Provider
        if decision_str == "BLOCK":
            blocked_response_text = (
                f"🛡️ **[Security Alert — Prompt Blocked by Universal AI Guardrail]**\n\n"
                f"Your request was intercepted and blocked before reaching the **{agent.name}**.\n\n"
                f"• **Risk Score**: `{int(risk_score * 100)}%` ({risk_level} Risk)\n"
                f"• **Threat Category**: `{guardrail_result.attack_type or 'Prompt Injection'}`\n"
                f"• **Triggered Security Rules**: {', '.join(triggered_rules_list) if triggered_rules_list else 'Statistical ML Hyperplane Boundary'}\n"
                f"• **Detection Reason**: {guardrail_result.explanation}\n\n"
                f"Please refine your prompt to comply with AI safety policies."
            )

            # Store assistant blocked explanation message
            bot_msg = Message(
                id=f"msg-{uuid.uuid4().hex[:12]}",
                conversation_id=conv.id,
                sender="assistant",
                content=blocked_response_text,
                risk_score=risk_score,
                risk_level=risk_level,
                decision="BLOCK",
                detection_reason=guardrail_result.explanation,
                triggered_rules=triggered_rules_list
            )
            db.add(bot_msg)
            db.commit()

            total_latency = round((time.perf_counter() - start_time) * 1000, 2)
            return {
                "conversation_id": conv.id,
                "message_id": bot_msg.id,
                "agent": {
                    "id": agent.id,
                    "slug": agent.slug or agent.id,
                    "name": agent.name,
                    "icon": agent.icon,
                    "category": agent.category
                },
                "decision": "BLOCK",
                "risk_score": risk_score,
                "risk_level": risk_level,
                "ml_score": ml_score,
                "attack_type": guardrail_result.attack_type or "PROMPT_INJECTION",
                "triggered_rules": triggered_rules_list,
                "reason": guardrail_result.explanation,
                "assistant_response": blocked_response_text,
                "output_guardrail": {
                    "verdict": "NOT_CALLED",
                    "sanitized": False
                },
                "latency_ms": total_latency,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        # IF ALLOW or WARN: Forward to AI Provider
        # Retrieve recent conversation context
        past_msgs = db.query(Message).filter(
            Message.conversation_id == conv.id
        ).order_by(Message.created_at.desc()).limit(8).all()
        history_context = [
            {"sender": m.sender, "content": m.content}
            for m in reversed(past_msgs)
        ]

        # Call AI Provider for selected agent
        raw_ai_response = self.ai_provider.generate_response(
            agent_id=agent.id,
            prompt=message_text,
            conversation_history=history_context
        )

        # Run Output Guardrail
        output_result = output_guardrail.inspect_output(raw_ai_response, agent.id)
        final_assistant_text = output_result.sanitized_text

        # Store Assistant Response in DB
        bot_msg = Message(
            id=f"msg-{uuid.uuid4().hex[:12]}",
            conversation_id=conv.id,
            sender="assistant",
            content=final_assistant_text,
            risk_score=output_result.risk_score,
            risk_level="HIGH" if output_result.verdict == "BLOCK" else "LOW",
            decision=output_result.verdict,
            detection_reason=output_result.explanation,
            triggered_rules=output_result.leakage_types
        )
        db.add(bot_msg)
        db.commit()

        total_latency = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "conversation_id": conv.id,
            "message_id": bot_msg.id,
            "agent": {
                "id": agent.id,
                "slug": agent.slug or agent.id,
                "name": agent.name,
                "icon": agent.icon,
                "category": agent.category
            },
            "decision": decision_str,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "ml_score": ml_score,
            "attack_type": guardrail_result.attack_type,
            "triggered_rules": triggered_rules_list,
            "reason": guardrail_result.explanation,
            "assistant_response": final_assistant_text,
            "output_guardrail": {
                "verdict": output_result.verdict,
                "sanitized": output_result.redacted_count > 0,
                "redacted_count": output_result.redacted_count,
                "leakage_types": output_result.leakage_types,
                "explanation": output_result.explanation
            },
            "latency_ms": total_latency,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# Global singleton
chat_service = ChatService()
