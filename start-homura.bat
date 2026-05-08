@echo off
setlocal EnableDelayedExpansion
title Homura - Smart Attendance System (Setup ^& Run)
color 0B

echo =======================================================
echo          HOMURA - SMART ATTENDANCE SYSTEM
echo =======================================================
echo.

:: 1. Kiem tra va tao file .env cho He thong
if exist ".env" goto check_models

if exist ".env.backup" (
    echo [KHOI PHUC] Khong tim thay file .env, dang khoi phuc tu ban sao luu (.env.backup)...
    copy /Y ".env.backup" ".env" >nul
    copy /Y ".env" "backend\.env" >nul
    copy /Y ".env" "frontend\.env" >nul
    echo [OK] Khoi phuc hoan tat!
    goto check_models
)

echo [SETUP] Phat hien day la lan chay dau tien!
echo Dang thiet lap cau hinh he thong an toan...
echo.

echo --- Cau hinh Database (Postgres) ---
set /p db_user="1. Nhap ten dang nhap Database (mac dinh: postgres): "
if "!db_user!"=="" set db_user=postgres

set /p db_pass="2. Nhap mat khau Database (mac dinh: 123456): "
if "!db_pass!"=="" set db_pass=123456

set /p db_name="3. Nhap ten Database (mac dinh: homura_db): "
if "!db_name!"=="" set db_name=homura_db

echo.
echo --- Cau hinh Storage (MinIO) ---
set /p minio_user="4. Nhap ten dang nhap MinIO (mac dinh: admin): "
if "!minio_user!"=="" set minio_user=admin

set /p minio_pass="5. Nhap mat khau MinIO (it nhat 8 ky tu, mac dinh: password): "
if "!minio_pass!"=="" set minio_pass=password

:: Tao random JWT Secret qua powershell
for /f "delims=" %%i in ('powershell -Command "[guid]::NewGuid().ToString().Replace('-', '')"') do set jwt_secret=%%i

:: Ghi vao file .env goc (Tong hop cho Docker)
echo # DATABASE CONFIG> .env
echo DB_USERNAME=!db_user!>> .env
echo DB_PASSWORD=!db_pass!>> .env
echo DB_DATABASE=!db_name!>> .env
echo DB_PORT=5432>> .env
echo.>> .env
echo # MINIO STORAGE CONFIG>> .env
echo MINIO_ROOT_USER=!minio_user!>> .env
echo MINIO_ROOT_PASSWORD=!minio_pass!>> .env
echo.>> .env
echo # SERVICE URLs>> .env
echo FASTAPI_URL=http://ai:8000>> .env
echo SERVER_URL=http://localhost:4000>> .env
echo NEXT_PUBLIC_SERVER_URL=http://localhost:4000>> .env
echo.>> .env
echo # SECURITY>> .env
echo JWT_SECRET=!jwt_secret!>> .env

:: Ghi vao backend\.env (Cac bien he thong)
echo DB_HOST=postgres> backend\.env
echo DB_PORT=5432>> backend\.env
echo DB_USERNAME=!db_user!>> backend\.env
echo DB_PASSWORD=!db_pass!>> backend\.env
echo DB_DATABASE=!db_name!>> backend\.env
echo JWT_SECRET=!jwt_secret!>> backend\.env
echo MINIO_ENDPOINT=minio>> backend\.env
echo MINIO_ACCESS_KEY=!minio_user!>> backend\.env
echo MINIO_SECRET_KEY=!minio_pass!>> backend\.env
echo AI_SERVICE_URL=http://ai:8000>> backend\.env

:: Ghi vao frontend\.env (Chi ghi cac bien NEXT_PUBLIC_)
echo NEXT_PUBLIC_SERVER_URL=http://localhost:4000> frontend\.env

:: Tao ban du phong cho file goc
copy /Y ".env" ".env.backup" >nul

echo.
echo [OK] Da tao xong file cau hinh (.env) cho tung phan!
echo [OK] Da luu ban du phong tai .env.backup
echo.

:check_models
:: 2. Tai Models AI neu thieu
echo [1] Kiem tra du lieu AI (Models)...
if exist "ai\models\detector.onnx" goto check_docker

echo Phat hien thieu AI Models!
echo Dang tai xuong va giai nen tu dong (Am tham, mat vai phut tuy mang)...
:: LUU Y: PHAI LA FILE ZIP, KHONG DUNG RAR! Link Dropbox dl=1 de tai truc tiep.
powershell -WindowStyle Hidden -Command "$ErrorActionPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://www.dropbox.com/scl/fi/quulqjy2vqoapwovz1kd1/models.zip?rlkey=jv99r0i9lpwrglnfpkneclg9w&st=3wdofte3&dl=1' -OutFile 'models.zip' -UseBasicParsing; Expand-Archive -Path 'models.zip' -DestinationPath 'ai' -Force; Remove-Item 'models.zip'" >nul 2>&1
echo [OK] Tai AI Models hoan tat!

:check_docker
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
