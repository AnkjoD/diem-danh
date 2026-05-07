@echo off
title Homura - He Thong Diem Danh Sinh Trac Hoc
color 0A

echo =======================================================
echo         HE THONG DIEM DANH HOMURA (TEACHER)
echo =======================================================
echo.

echo [1] Kiem tra trang thai Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [LOI] Docker chua duoc khoi dong! 
    echo Vui long mo ung dung "Docker Desktop" tren may tinh va thu lai.
    echo.
    pause
    exit /b
)
echo OK! Docker dang hoat dong.
echo.

echo [2] Dang khoi dong he thong...
docker-compose -f docker-compose.prod.yml up -d
echo.

echo [3] Dang doi he thong san sang (Khoang 10 giay)...
timeout /t 10 /nobreak >nul
echo.

echo [4] Mo trinh duyet truy cap trang danh cho Giao vien...
start http://localhost:3000

echo.
echo =======================================================
echo HE THONG DA HOAT DONG! 
echo Ban co the tat cua so nay. 
echo De tat toan bo he thong, go lenh: docker-compose down
echo =======================================================
pause
