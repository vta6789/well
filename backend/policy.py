"""Roles and booking lifecycle shared by domain validation and HTTP routes."""

ROLES = ["FAMILY", "SENIOR", "EXPERT", "RECEPTION", "NURSE", "DOCTOR", "ACCOUNTANT", "MANAGER", "ADMIN"]
OPS = ["RECEPTION", "MANAGER", "ADMIN"]
CLINICAL = ["NURSE", "DOCTOR", "MANAGER", "ADMIN"]
FINANCE = ["ACCOUNTANT", "MANAGER", "ADMIN"]
STATES = [
    "Chờ duyệt",
    "Danh sách chờ",
    "Đã xác nhận",
    "Đang lưu trú",
    "Hoàn tất",
    "Đã hủy",
]
