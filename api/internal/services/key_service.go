package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base32"
	"encoding/hex"
	"strings"
)

const keyPrefix = "gn_live_"

// GenerateAPIKey returns (rawKey, hash, displayPrefix, error).
// rawKey is shown to the user ONCE. Only hash is stored in the database.
// displayPrefix is the first 12 chars of the prefixed key (e.g., "gn_live_xxxx").
func GenerateAPIKey() (rawKey, hash, displayPrefix string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return
	}

	suffix := strings.ToLower(
		base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b))
	rawKey = keyPrefix + suffix

	h := sha256.Sum256([]byte(rawKey))
	hash = hex.EncodeToString(h[:])
	displayPrefix = rawKey[:12]
	return
}

// SHA256Hex returns the hex-encoded SHA-256 of a string.
func SHA256Hex(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}
