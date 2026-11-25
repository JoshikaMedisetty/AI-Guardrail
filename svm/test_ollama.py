import ollama

response = ollama.chat(
    model="llama3.2:3b",
    messages=[
        {
            "role": "user",
            "content": "Explain prompt injection in one simple sentence."
        }
    ]
)

print(response["message"]["content"])