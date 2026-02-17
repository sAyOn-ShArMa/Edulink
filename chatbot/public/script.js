let conversationHistory = [];

async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();

    if (!message) return;

    const chatContainer = document.getElementById('chatContainer');
    const sendBtn = document.getElementById('sendBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');

    // Display user message
    addMessage(message, 'user');

    // Clear input
    userInput.value = '';

    // Disable button and show loader
    sendBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';

    try {
        // Add user message to history
        conversationHistory.push({
            role: 'user',
            content: message
        });

        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                conversationHistory: conversationHistory.slice(-10) // Keep last 10 messages for context
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Add bot response
            addMessage(data.response, 'bot');

            // Add assistant message to history
            conversationHistory.push({
                role: 'assistant',
                content: data.response
            });
        } else {
            addMessage(`Error: ${data.error || 'Something went wrong'}`, 'bot', true);
        }
    } catch (error) {
        console.error('Error:', error);
        addMessage('Error: Unable to connect to the server. Make sure the server is running on port 3000.', 'bot', true);
    } finally {
        // Re-enable button and hide loader
        sendBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

function addMessage(text, sender, isError = false) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const messageContent = document.createElement('div');
    messageContent.className = isError ? 'message-content error-message' : 'message-content';

    const label = sender === 'user' ? 'You' : 'Bot';
    messageContent.innerHTML = `<strong>${label}:</strong> ${text}`;

    messageDiv.appendChild(messageContent);
    chatContainer.appendChild(messageDiv);

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Allow Enter key to send message (Shift+Enter for new line)
document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
