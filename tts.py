import sys
import asyncio
import edge_tts

# Voice choice — sounds very human
VOICE = "en-US-GuyNeural"  # male voice
# Other good options:
# "en-US-JennyNeural"     → female, American
# "en-GB-RyanNeural"      → male, British
# "en-GB-SoniaNeural"     → female, British
# "en-US-AriaNeural"      → female, American, warm tone

async def speak(text, output_file):
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(output_file)

if __name__ == "__main__":
    text = sys.argv[1]           # receives text from server.js
    output = sys.argv[2]         # receives output path from server.js
    asyncio.run(speak(text, output))