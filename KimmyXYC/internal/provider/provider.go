package provider

import (
	"context"
	"os"
	"strings"
	"time"
)

// ChatMessage represents a message sent to/from the model.
type ChatMessage struct {
	Role    string
	Content string
}

// StreamChunk represents a chunk of streamed content.
type StreamChunk struct {
	Content string
	Done    bool
	Err     error
}

// LLMProvider is an abstraction over an AI chat model provider.
type LLMProvider interface {
	// ChatCompletionStream streams the assistant reply for given messages and model.
	ChatCompletionStream(ctx context.Context, model string, messages []ChatMessage) (<-chan StreamChunk, error)
}

// NewProviderFromEnv selects a provider based on environment variables.
// NewProviderFromEnv 根据环境变量选择并返回一个 LLMProvider。
// 如果存在可用的 OpenAI 兼容配置（由 NewOpenAIProviderFromEnv 提供），则返回该提供者；否则返回一个用于测试/占位的 MockProvider。
// 读取 VOLC_API_KEY 保留用于将来真实提供者的支持。
func NewProviderFromEnv() LLMProvider {
	if p := NewOpenAIProviderFromEnv(); p != nil {
		return p
	}
	_ = os.Getenv("VOLC_API_KEY") // reserved for future real provider
	return &MockProvider{}
}

// MockProvider is a simple echo-based provider with fake streaming.
type MockProvider struct{}

func (m *MockProvider) ChatCompletionStream(ctx context.Context, model string, messages []ChatMessage) (<-chan StreamChunk, error) {
	ch := make(chan StreamChunk)
	go func() {
		defer close(ch)
		// naive: concatenate last user message and reply with a friendly echo
		var prompt string
		for i := len(messages) - 1; i >= 0; i-- {
			if strings.ToLower(messages[i].Role) == "user" {
				prompt = messages[i].Content
				break
			}
		}
		if prompt == "" {
			prompt = "Hello! Ask me anything."
		}
		reply := "[Mock-" + model + "] " + "You said: " + prompt
		// stream in word chunks
		words := strings.Split(reply, " ")
		for i, w := range words {
			select {
			case <-ctx.Done():
				ch <- StreamChunk{Err: ctx.Err()}
				return
			case ch <- StreamChunk{Content: func() string { if i == 0 { return w } ; return " " + w }()}:
				time.Sleep(50 * time.Millisecond)
			}
		}
		ch <- StreamChunk{Done: true}
	}()
	return ch, nil
}