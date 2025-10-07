package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"

	"AIBackend/internal/db"
	"AIBackend/internal/httpserver"
	"AIBackend/internal/provider"
)

// main 是程序的入口点。它可选加载 `.env`，使用 `DATABASE_URL` 建立并迁移数据库，
// 从环境创建 LLM 提供者，并使用 `ADDR`（默认 ":8080"）启动 HTTP 服务器；在连接、迁移或启动失败时记录致命错误，在缺少 `DATABASE_URL` 时记录警告。
func main() {
	// Load .env if present (dev convenience)
	_ = godotenv.Load()

	// Initialize DB
	pgURL := os.Getenv("DATABASE_URL")
	if pgURL == "" {
		log.Println("WARNING: DATABASE_URL is not set. The server may fail to start when DB is required.")
	}
	gormDB, err := db.Connect(pgURL)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(gormDB); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	// Initialize LLM provider (Mock by default)
	llm := provider.NewProviderFromEnv()

	// Start HTTP server
	r := httpserver.NewRouter(gormDB, llm)
	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = ":8080"
	}
	log.Printf("Server listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server error: %v", err)
	}
}