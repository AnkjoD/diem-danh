@echo off
title Homura - Cap Nhat He Thong
color 0E

echo =======================================================
echo         HE THONG DIEM DANH HOMURA (UPDATER)
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

echo [2] Dang tien hanh XAY DUNG LAI (Rebuild) toan bo he thong...
echo Qua trinh nay se mat mot luc de ap dung cac thay doi moi nhat.
echo.
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
echo.

echo [3] Dang doi he thong khoi dong sau khi cap nhat (Khoang 15 giay)...
timeout /t 15 /nobreak >nul
echo.

echo [4] Mo trinh duyet truy cap trang danh cho Giao vien...
start http://localhost:3000

echo.
echo =======================================================
echo CAP NHAT THANH CONG! He thong dang hoat dong voi phien ban moi nhat.
echo Ban co the tat cua so nay. 
echo =======================================================
pause
