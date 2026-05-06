$body = @{
    name    = "Jane Doe"
    email   = "jane.doe@example.com"
    message = "We need your enterprise plan before Friday for our board presentation."
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "x-api-key"    = "b95f7a2295e429e5c45d3e116de71341fbb681de27617f49"
}

Write-Host "`n=== Sending POST /lead ===" -ForegroundColor Cyan
Write-Host "Payload: $body" -ForegroundColor Gray

$response = Invoke-RestMethod `
    -Uri    "http://localhost:3000/lead" `
    -Method POST `
    -Headers $headers `
    -Body   $body

Write-Host "`n=== HTTP Response (Node 4: Return Enriched Response) ===" -ForegroundColor Green
$response | ConvertTo-Json -Depth 5
