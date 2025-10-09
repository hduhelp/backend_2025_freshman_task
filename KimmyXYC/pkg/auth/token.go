package auth

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var defaultSecret = []byte("dev-secret-change-me")

// jwtSecret 返回用于签名 JWT 的密钥字节切片。
// 它优先使用环境变量 JWT_SECRET 的非空值，若未设置或为空则返回包级默认密钥 defaultSecret.
func jwtSecret() []byte {
	if s := os.Getenv("JWT_SECRET"); s != "" {
		return []byte(s)
	}
	return defaultSecret
}

// Claims represents JWT claims for a user session.
type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// CreateToken 为给定用户生成并签名一个 JWT。
// 
// 生成的令牌包含用户标识（UserID）、邮箱（Email）、角色（Role）以及标准注册声明：
// 设置过期时间为当前时间加上 ttl，设置签发时间为当前时间。令牌使用 HS256 签名并由内部密钥签名。
// 返回签名后的 JWT 字符串；签名过程中发生错误则返回该错误。
func CreateToken(userID uint, email, role string, ttl time.Duration) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(jwtSecret())
}

// ParseToken 解析并验证给定的 JWT 字符串，成功时返回其中的 Claims。
// 如果解析过程出错会返回该错误；当 token 验证未通过时返回 "invalid token" 错误；
// 当提取到的声明不能断言为 *Claims 时返回 "invalid claims" 错误。
func ParseToken(token string) (*Claims, error) {
	tok, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return jwtSecret(), nil
	})
	if err != nil {
		return nil, err
	}
	if !tok.Valid {
		return nil, errors.New("invalid token")
	}
	claims, ok := tok.Claims.(*Claims)
	if !ok {
		return nil, errors.New("invalid claims")
	}
	return claims, nil
}