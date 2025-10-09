package db

import (
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"AIBackend/internal/models"
)

// Connect 使用提供的数据库 URL 打开一个 PostgreSQL 连接。
// 如果传入的 databaseURL 为空，则使用本地默认 DSN：
// postgres://postgres:postgres@localhost:5432/aibackend?sslmode=disable。
// 返回已打开的 *gorm.DB；在无法建立连接时返回非 nil 错误。
func Connect(databaseURL string) (*gorm.DB, error) {
	if databaseURL == "" {
		// Provide a friendly default to help first run; it will still fail if DB not available.
		databaseURL = "postgres://postgres:postgres@localhost:5432/aibackend?sslmode=disable"
	}
	dsn := databaseURL
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("connect postgres: %w", err)
	}
	return db, nil
}

// AutoMigrate 在数据库上应用 User、Conversation 和 Message 模型的自动迁移。
// 如果迁移失败，返回相应的错误。
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.User{},
		&models.Conversation{},
		&models.Message{},
	)
}