@echo off
setlocal EnableDelayedExpansion
title Homura - Reset System
color 0C

echo =======================================================
echo         HOMURA - KHOI PHUC TRANG THAI GOC
echo =======================================================
echo.
echo [CANH BAO] Thao tac nay se xoa toan bo du lieu trong Database
echo va Storage (MinIO), cung voi tat ca file cau hinh (.env).
echo He thong se duoc cai dat lai tu dau o lan chay tiep theo.
echo.
set /p confirm="Ban co chac chan muon tiep tuc? (y/n): "
if /I "!confirm!" neq "y" (
    echo.
    echo Da huy thao tac reset.
    pause
    exit /b
)

echo.
echo [1] Dang xoa cac Container va Du lieu (Volumes)...
docker-compose -f docker-compose.prod.yml down -v >nul 2>&1

echo [2] Dang xoa cac file cau hinh (.env)...
if exist ".env" del /F /Q ".env"
if exist ".env.backup" del /F /Q ".env.backup"
if exist "backend\.env" del /F /Q "backend\.env"
if exist "frontend\.env" del /F /Q "frontend\.env"

echo.
echo =======================================================
echo [OK] DA KHOI PHUC XONG!
echo Tat ca du lieu va cau hinh da duoc xoa sach.
echo Bay gio ban co the chay lai file "start-homura.bat"
echo de thiet lap lai mat khau tu dau.
echo =======================================================
pause
