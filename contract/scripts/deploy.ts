import hre, { ethers, artifacts } from 'hardhat'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL ?? ''
const supabaseKey = process.env.SUPABASE_ANON_KEY ?? ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const [owner] = await ethers.getSigners()

  const GroupFactory = await ethers.getContractFactory('GroupFactory')
  const groupFactory = await GroupFactory.deploy()
  await groupFactory.deployed()
  saveFrontendFiles('GroupFactory', groupFactory.address, true)

  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
  const groupId = uuidv4()
  const eventId = uuidv4()
  // TODO
  const userId = 'ef2d3685-67cf-4dd6-ace6-97ea8eb8597b'
  const groupName = `Group Name at ${now}`
  const eventTitle = `Event title at ${now}`

  const tx = await groupFactory.createGroup(groupId, '')
  const receipt = await tx.wait()
  // console.log('receipt', receipt)
  const groupAddress = receipt.events ? receipt.events[0]?.address : ''

  const { error } = await supabase.from('groups').insert({
    id: groupId,
    name: groupName,
    contract_address: groupAddress,
    // TODO
    created_user_id: userId,
    thumbnail:
      'https://ybtsfvbufxodsocxuwwx.supabase.co/storage/v1/object/public/images/groups/sample/people1.jpg',
  })

  console.log('error', error)

  const { error: error2 } = await supabase
    .from('members')
    .insert({ group_id: groupId, user_id: userId })
  console.log('error2', error2)
  if (!groupAddress) {
    return
  }

  // Group コントラクトに接続
  const Group = await hre.ethers.getContractFactory('Group')
  const group = Group.attach(groupAddress)
  saveFrontendFiles('Group', group.address)

  const tx2 = await group.createEvent(eventId)
  const receipt2 = await tx2.wait()
  // console.log('receipt2', receipt2)
  const eventAddress = receipt2.events ? receipt2.events[0]?.address : ''

  const { error: error3 } = await supabase.from('events').insert({
    id: eventId,
    group_id: groupId,
    contract_address: eventAddress,
    title: eventTitle,
    thumbnail:
      'https://ybtsfvbufxodsocxuwwx.supabase.co/storage/v1/object/public/images/events/sample/beer1.jpg',
    description: `コーヒー愛好家の皆さま、この度は『コーヒー飲み比べイベント』にご参加いただき誠にありがとうございます。このイベントでは、世界各国から厳選された5種類の特別なコーヒー豆を味わう機会を提供します。それぞれのコーヒー豆は、独特の風味と香りを持っており、それぞれが異なる育てられた環境と焙煎法から生まれます。

      このイベントは、コーヒーの深い世界をより深く理解し、味わいの違いを体験できるように設計されています。さらに、各コーヒーの特性を理解するための詳細な解説も提供します。

      もちろん、美味しいコーヒーを楽しむだけでなく、コーヒー愛好家のコミュニティとつながり、経験や知識を共有する絶好の機会です。皆様が素晴らしい時間を過ごし、コーヒーへの愛と理解を深めることができますよう、心より願っております。`,
  })

  if (!eventAddress) {
    return
  }

  // Event コントラクトに接続
  const Event = await hre.ethers.getContractFactory('Event')
  const event = Event.attach(eventAddress)
  saveFrontendFiles('Event', event.address)

  const ticketId = uuidv4()
  const ticketName = '無料チケット'
  await group.addTicketType(
    eventAddress,
    ticketId,
    ticketName,
    ethers.utils.parseEther('0'),
    10,
    0,
    'https://example.com/ticket-metadata',
    false,
  )
  // await group.addTicketType(
  //   eventAddress,
  //   '署名チケット',
  //   ethers.utils.parseEther('0'),
  //   20,
  //   2,
  //   'https://example.com/ticket-metadata',
  //   true,
  // )
  console.log('Added TicketType')

  const { error: error4 } = await supabase.from('tickets').insert({
    id: ticketId,
    event_id: eventId,
    name: ticketName,
    thumbnail:
      'https://images.unsplash.com/photo-1635070636690-d887c1a77e7b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1171&q=80',
  })

  await sleep(15)

  try {
    console.log('verifying... GroupFactory')
    await hre.run('verify:verify', {
      address: groupFactory.address,
    })
  } catch (e) {
    console.error('verify GroupFactory error', e)
  }

  try {
    console.log('verifying... Group')
    await hre.run('verify:verify', {
      address: groupAddress,
      constructorArguments: [groupId, ''],
    })
  } catch (e) {
    console.error('verify Group error', e)
  }

  try {
    console.log('verifying... Event')
    await hre.run('verify:verify', {
      address: eventAddress,
      constructorArguments: [eventId],
    })
  } catch (e) {
    console.error('verify Event error', e)
  }

  console.log('----- deploy成功 -----')
  console.log('GroupFactory', groupFactory.address)
  console.log('Group ID', groupId)
  console.log('Group Address', groupAddress)
  console.log('Event ID', eventId)
  console.log('Event Address', eventAddress)
}

function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

function saveFrontendFiles(
  contractName: string,
  address: string,
  constants = false,
) {
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

  if (constants) {
    fs.writeFileSync(
      path.join(contractsDir, 'constants.ts'),
      `
export const CONTRACT_ADDRESSES = {
  ${contractName}: "${address}"
}
`,
    )
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
