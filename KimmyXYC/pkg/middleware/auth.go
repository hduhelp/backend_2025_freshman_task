package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"AIBackend/pkg/auth"
)

// Allowed models by role (exported for reuse)
var AllowedModelsByRole = map[string][]string{
	"free":  {"mock-mini", "gpt-4o-mini"},
	"pro":   {"mock-mini", "mock-pro", "gpt-4o-mini", "gpt-4o"},
	"admin": {"mock-mini", "mock-pro", "mock-admin", "gpt-4o-mini", "gpt-4o", "gpt-4.1"},
}

// CheckModelAccess 验证给定角色是否被允许使用指定模型。
// 当 model 为空字符串时视为允许；否则在 AllowedModelsByRole 中查找该角色的允许列表并进行精确匹配。
// 返回 `true` 表示角色被允许使用该模型，`false` 表示不允许（包括角色不存在于映射时）。
func CheckModelAccess(role, model string) bool {
	if model == "" {
		return true
	}
	list := AllowedModelsByRole[role]
	for _, m := range list {
		if m == model {
			return true
		}
	}
	return false
}

// AuthRequired 返回一个 Gin 中间件，用于验证 Authorization Bearer JWT 并在成功时将用户信息存入上下文。
// 如果请求缺少或格式错误的 Bearer 令牌，或令牌解析失败，响应 401 并中止请求。
// 成功时在上下文中设置 "user_id"、"user_email" 和 "user_role" 三个键，然后继续处理链。
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if h == "" || !strings.HasPrefix(h, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		token := strings.TrimPrefix(h, "Bearer ")
		claims, err := auth.ParseToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Next()
	}
}

// ModelAccess 在存在 "model" 查询参数时根据上下文中的用户角色强制模型访问控制。
// 如果上下文中未设置 `user_role` 或为空，则视为 "free" 角色。
// 当查询参数 `model` 缺失时，跳过此中间件的访问检查以便后续处理器自行验证。
// 若访问被拒绝，中间件会以 403 状态并返回 JSON 错误信息终止请求。
func ModelAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("user_role")
		roleStr := "free"
		if r, ok := role.(string); ok && r != "" {
			roleStr = r
		}
		reqModel := c.Query("model")
		if reqModel == "" {
			// body may contain model; handler should validate with CheckModelAccess
			c.Next()
			return
		}
		if !CheckModelAccess(roleStr, reqModel) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "model access denied for role"})
			return
		}
		c.Next()
	}
}