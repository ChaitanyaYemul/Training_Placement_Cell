import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const execute = promisify(execFile);

/** Windows exposes file privacy through ACLs, not Node's POSIX mode bits. */
export async function validateWindowsAuditPermissions(path, { created }) {
  // Encode the path as data so quotes and PowerShell metacharacters stay literal.
  const encodedPath = Buffer.from(resolve(path), 'utf8').toString('base64');
  const script = `
$ErrorActionPreference = 'Stop'
$path = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPath}'))
$item = Get-Item -LiteralPath $path -Force
if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Reparse point' }
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
if ($${created ? 'true' : 'false'}) {
  $acl = New-Object Security.AccessControl.FileSecurity
  $acl.SetOwner($identity)
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($sid in @($identity.Value, 'S-1-5-18', 'S-1-5-32-544')) {
    $principal = New-Object Security.Principal.SecurityIdentifier($sid)
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($principal, 'FullControl', 'Allow')
    $acl.AddAccessRule($rule)
  }
  [IO.File]::SetAccessControl($path, $acl)
}
$acl = [IO.File]::GetAccessControl($path)
if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $identity.Value) { throw 'Unexpected owner' }
$allowed = @($identity.Value, 'S-1-5-18', 'S-1-5-32-544')
$rules = $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])
if ($rules.Count -eq 0) { throw 'Missing private access rules' }
foreach ($rule in $rules) {
  if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin $allowed) { throw 'Shared audit file' }
}
`;
  try {
    await execute(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(script, 'utf16le').toString('base64'),
      ],
      { windowsHide: true, timeout: 10000 },
    );
  } catch {
    // Never forward subprocess output or the operator's path into logs.
    throw new Error('Reconciliation audit requires a private regular file');
  }
}
