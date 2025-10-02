# Auto-Stop Project Feature

## Overview

Project akan otomatis berhenti (status kembali ke "stopped") setelah semua tugas selesai dijalankan, baik yang berhasil maupun yang mengalami error fatal.

## How It Works

### 1. Job Tracking Initialization

Saat project di-run (`POST /api/projects/:id/run`):
- Sistem menghitung total jobs yang akan dibuat
- Menyimpan `total_jobs` di `process_runs.stats`
- Menginisialisasi counter:
  - `total_jobs`: Total tugas yang dibuat
  - `completed_jobs`: 0 (akan di-increment saat job selesai)
  - `success_count`: 0 (jumlah sukses)
  - `error_count`: 0 (jumlah error)

### 2. Job Completion Tracking

Setiap kali job selesai (sukses atau gagal setelah semua retry):
- Event listener di `server.js` mendeteksi completion
- `completed_jobs` di-increment
- Sistem mengecek: `completed_jobs >= total_jobs`?
- Jika ya, project status diubah ke "stopped"

### 3. Status Update Flow

```
Job Completed/Failed (final)
    ↓
Increment completed_jobs
    ↓
Check: completed_jobs >= total_jobs?
    ↓ Yes
Update project.status = 'stopped'
    ↓
Update process_run.status = 'completed'
```

## Implementation Details

### Files Modified

#### 1. `backend/routes/projects.js`
- Menambahkan inisialisasi stats dengan `total_jobs` saat project di-run
- Stats structure:
  ```json
  {
    "total_jobs": 10,
    "completed_jobs": 0,
    "success_count": 0,
    "error_count": 0
  }
  ```

#### 2. `backend/queue.js`
- Menambahkan fungsi `checkAndUpdateProjectStatus(run_id, project_id)`
- Fungsi ini:
  - Membaca stats dari database
  - Membandingkan `completed_jobs` dengan `total_jobs`
  - Mengupdate project status jika semua job selesai
  - Mengupdate process_run status menjadi "completed"

#### 3. `backend/server.js`
- Menambahkan event listener untuk worker:
  - `worker.on('completed')`: Increment completed_jobs saat job sukses
  - `worker.on('failed')`: Increment completed_jobs saat job gagal final (setelah semua retry)
- Setiap increment diikuti dengan pengecekan status

## Retry Handling

Job yang di-retry **TIDAK** akan di-count sebagai completed sampai:
- **Sukses**: Setelah berhasil dijalankan
- **Gagal Final**: Setelah semua attempts (3x retry) habis

Contoh:
```
Job 1: Attempt 1 (fail) → retry
Job 1: Attempt 2 (fail) → retry  
Job 1: Attempt 3 (fail) → FINAL FAILURE → completed_jobs++
```

## Database Schema

### process_runs.stats (JSON)
```json
{
  "total_jobs": 10,        // Total jobs created
  "completed_jobs": 8,     // Jobs finished (success + final failures)
  "success_count": 7,      // Successfully sent messages
  "error_count": 1         // Failed messages (after all retries)
}
```

### project.status
- `running`: Project sedang berjalan
- `stopped`: Project berhenti (manual atau auto-stop)
- `paused`: Project di-pause (future feature)
- `failed`: Project gagal (future feature)

### process_run.status
- `running`: Process run sedang berjalan
- `completed`: Semua jobs selesai
- `stopped`: Di-stop manual oleh user
- `failed`: Process run gagal (future feature)

## Testing

### Test Case 1: All Jobs Success
1. Create project dengan 3 target channels
2. Click "Run"
3. Semua 3 jobs berhasil
4. **Expected**: Project status otomatis menjadi "stopped"

### Test Case 2: Some Jobs Fail
1. Create project dengan 5 target channels
2. Click "Run"
3. 3 jobs berhasil, 2 jobs gagal (setelah 3x retry)
4. **Expected**: Project status otomatis menjadi "stopped" setelah semua selesai

### Test Case 3: Manual Stop Before Complete
1. Create project dengan 10 target channels
2. Click "Run"
3. Setelah 5 jobs selesai, click "Stop"
4. **Expected**: Project status menjadi "stopped" (manual)
5. Remaining jobs tidak akan dijalankan

## Monitoring

### Backend Console Logs
```
[Queue] Adding job for channel @channel1, message type: text
[Worker] Processing job 1 for chat @channel1
Job 1 completed successfully
[Status Check] Run abc-123: 1/3 jobs completed
[Status Check] Run abc-123: 2/3 jobs completed
[Status Check] Run abc-123: 3/3 jobs completed
[Status Check] All jobs completed for run abc-123. Stopping project xyz-456...
[Status Check] ✅ Project xyz-456 stopped successfully
```

### Database Query
Check current progress:
```sql
SELECT 
  p.id,
  p.name,
  p.status,
  pr.stats
FROM projects p
JOIN process_runs pr ON pr.project_id = p.id
WHERE p.id = 'your-project-id'
ORDER BY pr.created_at DESC
LIMIT 1;
```

## Edge Cases Handled

1. **No jobs created**: Project tidak akan auto-stop (total_jobs = 0)
2. **Database error**: Error di-log, project tetap running
3. **Concurrent jobs**: Menggunakan atomic JSON operations untuk prevent race conditions
4. **Worker restart**: Stats tersimpan di database, tidak hilang saat restart

## Future Enhancements

- [ ] Add pause/resume functionality
- [ ] Add progress percentage in UI
- [ ] Send notification when project completes
- [ ] Add estimated time remaining
- [ ] Support for scheduled runs
