param([Parameter(Mandatory=$true)][string]$Destination, [Parameter(Mandatory=$true)][string]$Source)
$ErrorActionPreference = 'Stop'
try {
  if ($Destination -notmatch '^[A-Za-z]$' -or $Source -notmatch '^[A-Za-z]$') { throw 'Invalid drive letter' }
  $targetDisk = Get-Partition -DriveLetter $Destination | Get-Disk
  $sourceDisk = Get-Partition -DriveLetter $Source | Get-Disk
  $volume = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($Destination):'"
  if ($targetDisk.BusType -ne 'USB' -or $targetDisk.Number -eq $sourceDisk.Number -or $volume.DriveType -notin @(2,3)) { throw 'Independent USB required' }
  @{external=$true;busType='USB';fileSystem=$volume.FileSystem;freeBytes=[long]$volume.FreeSpace} | ConvertTo-Json -Compress
} catch {
  [Console]::Error.WriteLine('EXTERNAL_VOLUME_CHECK_FAILED: connect an independent USB drive and use its drive letter.')
  exit 1
}
