@echo off
REM ============================================================
REM  TrobosLink Local — Stop backend server (by port 3000)
REM ============================================================
echo [TrobosLink] Mencari proses di port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo [TrobosLink] Menghentikan PID: %%a
  taskkill /PID %%a /F
)
echo [TrobosLink] Selesai.