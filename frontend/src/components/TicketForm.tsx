import React, { useState, ChangeEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  NumberInput,
  NumberInputField,
  Switch,
  Select,
} from '@chakra-ui/react'
import { v4 as uuidv4 } from 'uuid'
import supabase from '@/lib/supabase'

const schema = z.object({
  name: z.string(),
  fee: z.string(),
  maxParticipants: z.number().int().positive(),
  participantType: z.number().int(),
  requireSignature: z.boolean(),
  img: z.any(),
})

export type FormData = z.infer<typeof schema>

type TicketFormProps = {
  onSubmitHandler: (data: FormData) => Promise<void>
}

export const TicketForm = ({ onSubmitHandler }: TicketFormProps) => {
  const [groupImage, setGroupImage] = useState<File | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      if (data.img) {
        const imgUrl = await uploadImageAndGetJSON(groupImage, data.name)
        data.img = imgUrl

        await onSubmitHandler(data)
      } else {
        alert('Please input image file')
      }
    } catch (error) {
      console.log('Error uploading file: ', error)
    }
  }

  const handleChangeImage = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setGroupImage(event.target.files[0])
    }
  }

  const uploadImageAndGetJSON = async (
    file: File | null,
    ticketName: string,
  ) => {
    try {
      const id = uuidv4()

      const imageFilePath = `images/tickets/${id}/ticket.png`
      const { data, error: imageUploadError } = await supabase.storage
        .from('metadata')
        .upload(imageFilePath, file!)

      if (imageUploadError) {
        console.error('Error uploading image:', imageUploadError)
        return
      }

      const {
        data: { publicUrl: imagePublicUrl },
      } = await supabase.storage.from('metadata').getPublicUrl(imageFilePath)
      console.log('imagePublicUrl', imagePublicUrl)

      const ticketData = {
        name: `${ticketName} ticket NFT`,
        description: `about ${ticketName} ticket`,
        image: imagePublicUrl,
      }

      const jsonFilePath = `json/tickets/${id}/ticket.json`
      const { error: jsonUploadError } = await supabase.storage
        .from('metadata')
        .upload(
          jsonFilePath,
          new Blob([JSON.stringify(ticketData)], { type: 'application/json' }),
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

      return jsonPublicUrl
    } catch (e) {
      console.log('e', e)
    }
  }

  return (
    <Box as='form' onSubmit={handleSubmit(onSubmit)} p={4}>
      <FormControl isInvalid={!!errors.name}>
        <FormLabel>Name</FormLabel>
        <Controller
          name='name'
          control={control}
          defaultValue=''
          render={({ field }) => <Input {...field} />}
        />
        <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
      </FormControl>

      <FormControl mt={4} isInvalid={!!errors.fee}>
        <FormLabel>Fee (MATIC)</FormLabel>
        <Controller
          name='fee'
          control={control}
          defaultValue={'0'}
          render={({ field }) => (
            <NumberInput
              {...field}
              onChange={(valueString) => {
                console.log(valueString)
                field.onChange(valueString)
              }}
            >
              <NumberInputField {...field} />
            </NumberInput>
          )}
        />
        <FormErrorMessage>{errors.fee?.message}</FormErrorMessage>
      </FormControl>

      <FormControl mt={4} isInvalid={!!errors.maxParticipants}>
        <FormLabel>Max Participants</FormLabel>
        <Controller
          name='maxParticipants'
          control={control}
          defaultValue={0}
          render={({ field }) => (
            <NumberInput
              {...field}
              onChange={(valueString) => {
                console.log(valueString)
                field.onChange(Number(valueString))
              }}
            >
              <NumberInputField {...field} />
            </NumberInput>
          )}
        />
        <FormErrorMessage>{errors.maxParticipants?.message}</FormErrorMessage>
      </FormControl>

      <FormControl mt={4} isInvalid={!!errors.participantType}>
        <FormLabel>Participant Type</FormLabel>
        <Controller
          name='participantType'
          control={control}
          defaultValue={0}
          render={({ field }) => (
            <Select
              {...field}
              onChange={(e) => {
                console.log(Number(e.target.value))
                field.onChange(Number(e.target.value))
              }}
            >
              <option value={0}>Listener</option>
              <option value={1}>Speaker</option>
            </Select>
          )}
        />
        <FormErrorMessage>{errors.participantType?.message}</FormErrorMessage>
      </FormControl>

      <FormControl mt={4} isInvalid={!!errors.requireSignature}>
        <FormLabel>
          Require Signature
          <Controller
            name='requireSignature'
            control={control}
            defaultValue={false}
            render={({ field }) => (
              <Switch
                colorScheme='blue'
                isChecked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
        </FormLabel>
        <FormErrorMessage>{errors.requireSignature?.message}</FormErrorMessage>
      </FormControl>

      <FormControl mt={4} isInvalid={!!errors.img}>
        <FormLabel>Image File</FormLabel>
        <Controller
          name='img'
          control={control}
          defaultValue=''
          render={({ field: { onChange, ...rest } }) => (
            <Input
              type='file'
              {...rest}
              onChange={(e) => {
                handleChangeImage(e)
                onChange(e)
              }}
            />
          )}
        />
      </FormControl>

      <Button colorScheme='blue' mt={4} type='submit'>
        Submit
      </Button>
    </Box>
  )
}
