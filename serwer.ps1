# Speedway Empire 3D — mały serwer plików dla gry (tylko ten komputer, localhost)
# Uruchamiany przez „Uruchom Speedway Empire 3D.bat”. Zamknij okno, żeby zatrzymać.
# • kilka wątków naraz (modele, tekstury i animacje pobierają się równolegle)
# • modele i tekstury z pamięci podręcznej przeglądarki (ETag / 304) — kolejne uruchomienia są szybkie
param([int]$Port = 5180, [int]$Threads = 8)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$http = New-Object System.Net.HttpListener
$http.Prefixes.Add("http://localhost:$Port/")
try { $http.Start() } catch { Write-Host "Port $Port jest zajęty — gra prawdopodobnie już działa."; exit 1 }
Write-Host "Speedway Empire 3D działa na http://localhost:$Port/  (zamknij to okno, aby wyłączyć)"

$worker = {
  param($http, $root)
  $types = @{
    '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
    '.json' = 'application/json'; '.glb' = 'model/gltf-binary'; '.gltf' = 'model/gltf+json'; '.bin' = 'application/octet-stream'
    '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.svg' = 'image/svg+xml'; '.txt' = 'text/plain; charset=utf-8'
    '.md' = 'text/plain; charset=utf-8'; '.ico' = 'image/x-icon'; '.fbx' = 'application/octet-stream'; '.webmanifest' = 'application/manifest+json'; '.webp' = 'image/webp'
  }
  while ($http.IsListening) {
    try { $ctx = $http.GetContext() } catch { break }
    $res = $ctx.Response
    try {
      $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ($path -eq '') { $path = 'index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $root $path))
      if ($file.StartsWith($root) -and [IO.File]::Exists($file)) {
        $info = New-Object IO.FileInfo $file
        $ext = $info.Extension.ToLower()
        $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
        $etag = '"' + $info.Length.ToString('x') + '-' + $info.LastWriteTimeUtc.Ticks.ToString('x') + '"'
        $res.Headers.Add('ETag', $etag)
        # kod i dane gry sprawdzamy przy każdym starcie (ETag), modele/tekstury trzymamy dłużej
        if ($path -like 'models/*' -or $path -like 'lib/*') { $res.Headers.Add('Cache-Control', 'public, max-age=604800') }
        else { $res.Headers.Add('Cache-Control', 'no-cache') }
        if ($ctx.Request.Headers['If-None-Match'] -eq $etag) { $res.StatusCode = 304 }
        else {
          $res.ContentLength64 = $info.Length
          $fs = [IO.File]::OpenRead($file)
          try { $fs.CopyTo($res.OutputStream, 262144) } finally { $fs.Close() }
        }
      } else { $res.StatusCode = 404 }
    } catch { } finally { try { $res.OutputStream.Close() } catch { } }
  }
}

$pool = [RunspaceFactory]::CreateRunspacePool(1, $Threads); $pool.Open()
$jobs = 1..$Threads | ForEach-Object {
  $ps = [PowerShell]::Create(); $ps.RunspacePool = $pool
  [void]$ps.AddScript($worker).AddArgument($http).AddArgument($root)
  @{ ps = $ps; h = $ps.BeginInvoke() }
}
try { while ($http.IsListening) { Start-Sleep -Milliseconds 500 } }
finally { $http.Stop(); $jobs | ForEach-Object { $_.ps.Dispose() }; $pool.Close() }
