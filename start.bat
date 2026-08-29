@echo off
REM ============================================================
REM  TrobosLink Local — Start backend server (detached, no track)
REM  Menjalankan node secara mandiri agar tidak memicu notifikasi
REM  "background exited" dari Hermes (artefak job-control bash).
REM ============================================================
cd /d "%~dp0backend"
echo [TrobosLink] Menjalankan backend di http://127.0.0.1:3000
echo [TrobosLink] Tutup jendela ini untuk menghentikan server.
start "TrobosLink-Backend" /min cmd /c "node src/server.js"