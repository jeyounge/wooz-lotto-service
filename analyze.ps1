$jsonPath = "c:\project\wooz-lotto-service\src\data\lottoHistory.json"
$history = Get-Content $jsonPath -Raw | ConvertFrom-Json

$totalDraws = $history.Length
$monthHit = 0
$dayHit = 0
$bothHit = 0
$eitherHit = 0

$recentHits = @()

foreach ($draw in $history) {
    if (-not $draw.drwNoDate) { continue }
    
    $parts = $draw.drwNoDate.Split('-')
    if ($parts.Length -ne 3) { continue }
    
    $month = [int]$parts[1]
    $day = [int]$parts[2]
    
    $hasMonth = $draw.numbers -contains $month
    $hasDay = $draw.numbers -contains $day
    
    if ($hasMonth) { $monthHit++ }
    if ($hasDay) { $dayHit++ }
    if ($hasMonth -and $hasDay) { $bothHit++ }
    if ($hasMonth -or $hasDay) { $eitherHit++ }
}

$monthProb = [math]::Round(($monthHit / $totalDraws) * 100, 2)
$dayProb = [math]::Round(($dayHit / $totalDraws) * 100, 2)
$bothProb = [math]::Round(($bothHit / $totalDraws) * 100, 2)
$eitherProb = [math]::Round(($eitherHit / $totalDraws) * 100, 2)

Write-Host "`n=== 추첨일(월/일) 적중 분석 결과 ==="
Write-Host "분석 대상: 총 $totalDraws 회차"
Write-Host "-----------------------------------"
Write-Host "- 월($monthHit 회) 일치 확률: ${monthProb}%"
Write-Host "- 일($dayHit 회) 일치 확률: ${dayProb}%"
Write-Host "- 월, 일 모두 일치 확률: ${bothProb}%"
Write-Host "- 월 또는 일 중 하나라도 일치 확률: ${eitherProb}%"
