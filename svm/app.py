import streamlit as st
import ollama

# -----------------------------
# Page configuration
# -----------------------------
st.set_page_config(
    page_title="Prompt Injection Agent",
    page_icon="🛡️",
    layout="centered"
)

st.title("🛡️ Prompt Injection Protection Agent")
st.caption("Powered by Llama 3.2")

# -----------------------------
# Chat history
# -----------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display previous messages
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# -----------------------------
# User input
# -----------------------------
user_input = st.chat_input("Ask the agent something...")

if user_input:

    # Display user message
    with st.chat_message("user"):
        st.markdown(user_input)

    st.session_state.messages.append({
        "role": "user",
        "content": user_input
    })

    # Ask Llama
    with st.chat_message("assistant"):

        response = ollama.chat(
            model="llama3.2:3b",
            messages=st.session_state.messages
        )

        answer = response["message"]["content"]

        st.markdown(answer)

    st.session_state.messages.append({
        "role": "assistant",
        "content": answer
    })