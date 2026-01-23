package noopstorage

import (
	"context"
	"strings"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/storage"
)

func TestNoOpStorage_New(t *testing.T) {
	s := New()
	if s == nil {
		t.Fatal("New() returned nil")
	}
}

func TestNoOpStorage_List(t *testing.T) {
	s := New()
	ctx := context.Background()

	result, err := s.List(ctx, "", storage.ListOptions{})
	if err != nil {
		t.Fatalf("List() returned error: %v", err)
	}

	if result.TotalCount != 0 {
		t.Errorf("Expected TotalCount to be 0, got %d", result.TotalCount)
	}

	if len(result.Items) != 0 {
		t.Errorf("Expected empty Items slice, got %d items", len(result.Items))
	}
}

func TestNoOpStorage_Get(t *testing.T) {
	s := New()
	ctx := context.Background()

	reader, err := s.Get(ctx, "test-file")
	if err == nil {
		t.Fatal("Get() should return error for NoOp storage")
	}

	if reader != nil {
		t.Error("Get() should return nil reader for NoOp storage")
	}

	expectedMsg := "storage not configured"
	if !strings.Contains(err.Error(), expectedMsg) {
		t.Errorf("Expected error to contain '%s', got: %v", expectedMsg, err)
	}
}

func TestNoOpStorage_Put(t *testing.T) {
	s := New()
	ctx := context.Background()
	content := strings.NewReader("test content")

	err := s.Put(ctx, "test-file", content)
	if err == nil {
		t.Fatal("Put() should return error for NoOp storage")
	}

	expectedMsg := "storage not configured"
	if !strings.Contains(err.Error(), expectedMsg) {
		t.Errorf("Expected error to contain '%s', got: %v", expectedMsg, err)
	}
}

func TestNoOpStorage_Delete(t *testing.T) {
	s := New()
	ctx := context.Background()

	err := s.Delete(ctx, "test-file")
	if err == nil {
		t.Fatal("Delete() should return error for NoOp storage")
	}

	expectedMsg := "storage not configured"
	if !strings.Contains(err.Error(), expectedMsg) {
		t.Errorf("Expected error to contain '%s', got: %v", expectedMsg, err)
	}
}

func TestNoOpStorage_CreateFolder(t *testing.T) {
	s := New()
	ctx := context.Background()

	err := s.CreateFolder(ctx, "test-folder")
	if err == nil {
		t.Fatal("CreateFolder() should return error for NoOp storage")
	}

	expectedMsg := "storage not configured"
	if !strings.Contains(err.Error(), expectedMsg) {
		t.Errorf("Expected error to contain '%s', got: %v", expectedMsg, err)
	}
}

func TestNoOpStorage_Stat(t *testing.T) {
	s := New()
	ctx := context.Background()

	fileInfo, err := s.Stat(ctx, "test-file")
	if err == nil {
		t.Fatal("Stat() should return error for NoOp storage")
	}

	// Should return empty FileInfo
	if fileInfo.Name != "" || fileInfo.Path != "" || fileInfo.Size != 0 {
		t.Error("Stat() should return empty FileInfo for NoOp storage")
	}

	expectedMsg := "storage not configured"
	if !strings.Contains(err.Error(), expectedMsg) {
		t.Errorf("Expected error to contain '%s', got: %v", expectedMsg, err)
	}
}

func TestNoOpStorage_ImplementsInterface(t *testing.T) {
	var _ storage.Storage = (*NoOpStorage)(nil)
}

func TestNoOpStorage_Copy(t *testing.T) {
	s := New()
	ctx := context.Background()

	err := s.Copy(ctx, "source.txt", "dest.txt")
	if err == nil {
		t.Fatal("Copy() should return error for NoOp storage")
	}

	expectedMsg := "storage not configured"
	if !strings.Contains(err.Error(), expectedMsg) {
		t.Errorf("Expected error to contain '%s', got: %v", expectedMsg, err)
	}
}

func TestNoOpStorage_Move(t *testing.T) {
	s := New()
	ctx := context.Background()

	err := s.Move(ctx, "source.txt", "dest.txt")
	if err == nil {
		t.Fatal("Move() should return error for NoOp storage")
	}

	expectedMsg := "storage not configured"
	if !strings.Contains(err.Error(), expectedMsg) {
		t.Errorf("Expected error to contain '%s', got: %v", expectedMsg, err)
	}
}
