@echo off
setlocal EnableDelayedExpansion
title Homura - Smart Attendance System (Setup ^& Run)
color 0B

echo =======================================================
echo          HOMURA - SMART ATTENDANCE SYSTEM
echo =======================================================
echo.

:: 1. Kiem tra va tao file .env cho Backend ^& Frontend
if not exist "backend\.env" (
    if exist "backend\.env.backup" (
        echo [KHOI PHUC] Khong tim thay file .env, dang khoi phuc tu ban sao luu (.env.backup)...
        copy /Y "backend\.env.backup" "backend\.env" >nul
        copy /Y "frontend\.env.backup" "frontend\.env" >nul
        echo [OK] Khoi phuc hoan tat!
    ) else (
        echo [SETUP] Phat hien day la lan chay dau tien!
        echo Dang thiet lap cau hinh he thong an toan...
        echo.
        set /p db_user="1. Nhap ten dang nhap Database (mac dinh: postgres): "
        if "!db_user!"=="" set db_user=postgres
        
        set /p db_pass="2. Nhap mat khau Database (mac dinh: 123456): "
        if "!db_pass!"=="" set db_pass=123456
        
        :: Tao random JWT Secret qua powershell
        for /f "delims=" %%i in ('powershell -Command "[guid]::NewGuid().ToString().Replace('-', '')"') do set jwt_secret=%%i
        
        :: Ghi vao backend\.env
        echo POSTGRES_USER=!db_user!> backend\.env
        echo POSTGRES_PASSWORD=!db_pass!>> backend\.env
        echo POSTGRES_DB=homura_db>> backend\.env
        echo DB_HOST=db>> backend\.env
        echo DB_PORT=5432>> backend\.env
        echo JWT_SECRET=!jwt_secret!>> backend\.env
        echo JWT_EXPIRATION=7d>> backend\.env
        echo CORS_ORIGIN=http://localhost:3000>> backend\.env
        
        :: Ghi vao frontend\.env
        echo NEXT_PUBLIC_API_URL=http://localhost:3001> frontend\.env
        
        :: Tao luon file Backup de phong ho nguoi dung xoa nham
        copy /Y "backend\.env" "backend\.env.backup" >nul
        copy /Y "frontend\.env" "frontend\.env.backup" >nul
        
        echo.
        echo [OK] Da tao xong file cau hinh voi bao mat JWT ngau nhien!
        echo [OK] Da luu ban du phong tai .env.backup
        echo.
    )
)

:: 2. Tai Models AI neu thieu
echo [1] Kiem tra du lieu AI (Models)...
if not exist "backend\models\face_landmark_68_model.dat" (
    echo Phat hien thieu AI Models!
    echo Dang tai xuong va giai nen tu dong (Am tham, mat vai phut tuy mang)...
    :: Su dung dl=1 cho dropbox. LUU Y: PHAI LA FILE ZIP, KHONG DUNG RAR!
    powershell -WindowStyle Hidden -Command "$ErrorActionPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://www.dropbox.com/scl/fi/quulqjy2vqoapwovz1kd1/models.zip?rlkey=jv99r0i9lpwrglnfpkneclg9w&st=3wdofte3&dl=1' -OutFile 'models.zip' -UseBasicParsing; Expand-Archive -Path 'models.zip' -DestinationPath 'backend\models' -Force; Remove-Item 'models.zip'" >nul 2>&1
    echo [OK] Tai AI Models hoan tat!
) else (
    echo [OK] AI Models da san sang.
)

:: 3. Kiem tra Docker
echo.
echo [2] Kiem tra trang thai Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [LOI] Docker chua duoc khoi dong hoac chua duoc cai dat! 
    echo Vui long mo ung dung "Docker Desktop" roi thu lai.
    echo.
    pause
    exit /b
)
echo [OK] Docker dang hoat dong.
echo.

:: 4. Khoi dong He Thong
echo [3] Dang khoi dong he thong...
docker-compose -f docker-compose.prod.yml up -d --build
echo.

echo [4] Dang doi he thong san sang (Khoang 10 giay)...
timeout /t 10 /nobreak >nul
echo.

echo [5] Mo trinh duyet truy cap trang danh cho Giao vien...
start http://localhost:3000

echo.
echo =======================================================
echo HE THONG DA HOAT DONG! 
echo Ban co the tat cua so nay. 
echo De tat toan bo he thong, go lenh: docker-compose down
echo =======================================================
pause
