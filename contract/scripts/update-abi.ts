import { artifacts } from 'hardhat'
import path from 'path'

async function main() {
  saveFrontendFiles('Event')
}

function saveFrontendFiles(contractName: string) {
  const fs = require('fs')
  const contractsDir = path.join(
    __dirname,
    '..',
    '..',
    'frontend',
    'src',
    'contracts',
  )

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir)
  }

  const artifact = artifacts.readArtifactSync(contractName)

  fs.writeFileSync(
    path.join(contractsDir, `${contractName}Abi.json`),
    JSON.stringify(artifact.abi, null, 2),
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
