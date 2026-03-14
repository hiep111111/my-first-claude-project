const fs = require('fs');
async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const data = JSON.parse(input);
  const path = data.tool_input?.file_path || data.tool_input?.path || "";
  if (path.includes('.env')) {
    console.error("BLOCK BY HIỆP: Bạn không có quyền truy cập file nhạy cảm này!");
    process.exit(2);
  }
  process.exit(0);
}
main();
