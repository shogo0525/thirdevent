import { GetServerSideProps } from 'next'
import Head from 'next/head'
import NextLink from 'next/link'
import { useState, useRef, ChangeEvent } from 'react'
import { useRouter } from 'next/router'
import { v4 as uuidv4 } from 'uuid'
import supabase from '@/lib/supabase'
import {
  useSDK,
  Web3Button,
  useAddress,
  useContract,
  useContractRead,
  useContractWrite,
  useContractEvents,
} from '@thirdweb-dev/react'
import { CONTRACT_ADDRESSES } from '@/contracts/constants'
import GroupFactoryAbi from '@/contracts/GroupFactoryAbi.json'
import {
  Stack,
  Button,
  Text,
  Input,
  Link,
  Image,
  Box,
  useToast,
} from '@chakra-ui/react'
import { useAuth } from '@/contexts/AuthProvider'
import { COOKIE } from '@/constants'
import { isTokenExpired } from '@/utils'

interface NewGroupProps {}

export const getServerSideProps: GetServerSideProps<NewGroupProps> = async (
  context,
) => {
  const tokenExpiration = context.req.cookies[COOKIE.TOKEN_EXPIRATION]
  if (isTokenExpired(tokenExpiration)) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    }
  }
  return {
    props: {},
  }
}

const NewGroup = () => {
  const toast = useToast()
  const router = useRouter()
  const { user } = useAuth()

  const address = useAddress()
  const { contract } = useContract(
    CONTRACT_ADDRESSES.GroupFactory,
    GroupFactoryAbi,
  )

  const [groupName, setGroupName] = useState('')
  const inputFileRef = useRef<HTMLInputElement>(null)
  const [groupImage, setGroupImage] = useState<File | null>(null)

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setGroupName(event.target.value)
  }

  const {
    mutateAsync: mutateCreateGroup,
    isLoading,
    error,
  } = useContractWrite(contract, 'createGroup')

  const createGroup = async () => {
    try {
      if (!user || !groupImage) return
      const groupId = uuidv4()

      const imageFilePath = `images/groups/${groupId}/membership.png`
      const { error: imageUploadError } = await supabase.storage
        .from('metadata')
        .upload(imageFilePath, groupImage)

      if (imageUploadError) {
        console.error('Error uploading image:', imageUploadError)
        toast({
          title: 'Error uploading image.',
          description: imageUploadError.message,
          status: 'error',
          duration: 9000,
          position: 'top',
          isClosable: true,
        })
        return
      }

      const {
        data: { publicUrl: imagePublicUrl },
      } = await supabase.storage.from('metadata').getPublicUrl(imageFilePath)
      console.log('imagePublicUrl', imagePublicUrl)

      const groupData = {
        name: `${groupName} membership NFT`,
        description: `about ${groupName} membership`,
        image: imagePublicUrl,
        attributes: [
          {
            trait_type: 'メンバータイプ',
            value: '運営メンバー',
          },
          {
            trait_type: '役割',
            value: 'エンジニア',
          },
        ],
      }

      const jsonFilePath = `json/groups/${groupId}/membership.json`
      const { error: jsonUploadError } = await supabase.storage
        .from('metadata')
        .upload(
          jsonFilePath,
          new Blob([JSON.stringify(groupData)], { type: 'application/json' }),
          { contentType: 'application/json' },
        )

      if (jsonUploadError) {
        console.error('Error uploading JSON:', jsonUploadError)
        return
      }

      const {
        data: { publicUrl: jsonPublicUrl },
      } = supabase.storage.from('metadata').getPublicUrl(jsonFilePath)

      console.log('jsonPublicUrl', jsonPublicUrl)

      const { receipt } = await mutateCreateGroup({
        args: [groupId, jsonPublicUrl],
      })
      const groupAddress = (receipt as any).events[0].address

      const { error } = await supabase.from('groups').insert({
        id: groupId,
        name: groupName,
        contract_address: groupAddress,
        created_user_id: user.id,
        thumbnail: imagePublicUrl,
      })

      if (error) {
        console.error('Error inserting data:', error)
        return
      }

      const { error: error2 } = await supabase
        .from('members')
        .insert({ group_id: groupId, user_id: user.id })

      if (error2) {
        console.error('Error inserting data:', error2)
      }

      router.push(`/groups/${groupId}`)
    } catch (e) {
      console.log('e', e)
    }
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    file && setGroupImage(file)
  }

  const handleUploadClick = () => {
    inputFileRef.current?.click()
  }

  return (
    <Stack>
      <Input
        placeholder='グループ名'
        value={groupName}
        onChange={handleNameChange}
      />
      <Input
        type='file'
        accept='image/*'
        style={{ display: 'none' }}
        ref={inputFileRef}
        onChange={handleImageChange}
      />
      <Button
        borderRadius='none'
        p={0}
        width='100%'
        height={{ base: '200px', md: '300px' }}
        bgColor={'gray.200'}
        onClick={handleUploadClick}
      >
        {groupImage ? (
          <Image
            src={URL.createObjectURL(groupImage)}
            alt='選択された画像'
            width='100%'
            height='100%'
            objectFit='cover'
          />
        ) : (
          '画像を選択'
        )}
      </Button>
      <Button
        onClick={createGroup}
        isLoading={isLoading}
        colorScheme='purple'
        isDisabled={!groupName || !groupImage}
      >
        グループを作成
      </Button>
    </Stack>
  )
}

export default NewGroup
