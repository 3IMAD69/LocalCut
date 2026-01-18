# GitHub Copilot Instructions

## Reference Documentation

When working with Mediabunny library code, fetch and reference the comprehensive documentation from:
- https://mediabunny.dev/llms-full.txt

This URL contains the complete Mediabunny guide including:
- API documentation with TypeScript definitions
- Usage examples and patterns
- Best practices and guidelines
- All supported formats and codecs

## When to Fetch Documentation

Automatically fetch the documentation when:
- User asks about Mediabunny functionality
- Code involves media file processing (video, audio, conversion)
- Questions about container formats (MP4, WebM, MKV, etc.)
- Codec-related queries (encoding, decoding)
- Media stream handling
- VideoSample, AudioSample, or EncodedPacket usage

## Coding Guidelines

1. **Use the latest Mediabunny APIs** as defined in the fetched documentation
2. **Prefer TypeScript** for type safety
3. **Include proper error handling** for media operations
4. **Close resources** (samples, packets) when done using them
5. **Handle backpressure** by awaiting promises from media sources
6. **Follow async/await patterns** for all I/O operations

## Example Patterns

When suggesting Mediabunny code:
- Always import from 'mediabunny'
- Use proper type annotations
- Show complete, working examples
- Include resource cleanup (close() methods)
- Demonstrate error handling

## Response Style

- Provide detailed explanations with code examples
- Reference specific sections from the documentation
- Explain trade-offs between different approaches
- Suggest performance optimizations when relevant
- Clarify timing (seconds vs microseconds)

## Context Awareness

Remember that:
- All timestamps in Mediabunny use seconds (not microseconds)
- Samples must be manually closed to free resources
- Backpressure is communicated via promises
- Different formats have different capabilities
- WebCodecs API integration is a core feature

## UI/Design System

This project uses the **Caffeine** design style. See [ui-design-system.instructions.md](./ui-design-system.instructions.md) for complete guidelines.

---

## MediaFox Documentation

**CRITICAL:** When working with media playback or React components related to media:
1. **MUST READ** [.github/mediafox-react.instructions.md](.github/mediafox-react.instructions.md) for React integration patterns and mandatory usage rules.
2. **MUST READ ALL** markdown files in the [.github/mediafox-docs/](.github/mediafox-docs/) folder to understand the core API, state management, and event system.
3. **DO NOT** use native HTML5 `<video>` or `<audio>` elements. Use MediaFox components which render to `<canvas>`.


## Editor Architecture

When working with the video editor code:
1. **MUST READ** [docs/EDITOR_ARCHITECTURE.md](../docs/EDITOR_ARCHITECTURE.md) for a high-level overview of the editor architecture, key state flows, and common tasks.
2. **MUST UNDERSTAND** the directory structure and component map to effectively navigate the codebase.
3. **MUST FOLLOW** established state management patterns as described in the architecture document.