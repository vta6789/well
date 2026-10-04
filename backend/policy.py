"""Roles and booking lifecycle shared by domain validation and HTTP routes."""

ROLES = ["FAMILY", "RECEPTION", "NURSE", "DOCTOR", "ACCOUNTANT", "MANAGER", "ADMIN"]
OPS = ["RECEPTION", "MANAGER"]
CLINICAL = ["NURSE", "DOCTOR", "MANAGER"]
FINANCE = ["ACCOUNTANT", "MANAGER"]
STATES = [
    "Chờ duyệt",
    "Danh sách chờ",
    "Đã xác nhận",
    "Đang lưu trú",
    "Hoàn tất",
    "Đã hủy",
]
