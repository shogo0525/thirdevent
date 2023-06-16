import React, { useState, useRef, ChangeEvent } from 'react'
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
  Image,
  Stack,
} from '@chakra-ui/react'
import { v4 as uuidv4 } from 'uuid'
import supabase from '@/lib/supabase'
import { Event, TicketRuleType } from '@/types'

const schema = z.object({
  name: z.string(),
  fee: z.string(),
  maxParticipants: z.number().int().positive(),
  participantType: z.number().int(),
  img: z.any(),
  requireSignature: z.boolean(),
  ruleType: z.enum(['allowlist', 'code', 'nft']).optional(),
  ruleValue: z.string().optional(),
})

export type FormData = z.infer<typeof schema>

type TicketFormProps = {
  event: Event
  onSubmitHandler: (
    newTicketId: string,
    data: FormData,
    thumbnail: string,
  ) => Promise<void>
}

export const TicketForm = ({ event, onSubmitHandler }: TicketFormProps) => {
  const [ticketImage, setTicketImage] = useState<File | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const requireSignature = watch('requireSignature')
  const ruleType = watch('ruleType')
  console.log(requireSignature, ruleType, errors)

  const onSubmit = async (data: FormData) => {
    console.log(data)

    try {
      if (data.img) {
        const { data: uploadResult } = await uploadImageAndGetJSON(
          ticketImage,
          data.name,
        )
        if (uploadResult) {
          const { ticketId, ticketImageUrl, metadataURI } = uploadResult
          data.img = metadataURI

          const { error } = await supabase.from('tickets').insert({
            id: ticketId,
            event_id: event.id,
            name: data.name,
            thumbnail: ticketImageUrl,
            rule_type: data.ruleType,
            rule_value: data.ruleValue,
          })

          await onSubmitHandler(ticketId, data, ticketImageUrl)
        }
      } else {
        alert('Please input image file')
      }
    } catch (error) {
      console.log('Error uploading file: ', error)
    }
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    file && setTicketImage(file)
  }

  const uploadImageAndGetJSON = async (
    file: File | null,
    ticketName: string,
  ) => {
    const ticketId = uuidv4()

    try {
      const imageFilePath = `images/events/${event.id}/tickets/${ticketId}/ticket.png`
      const jsonFilePath = `json/events/${event.id}/tickets/${ticketId}/ticket.json`

      const { data, error: imageUploadError } = await supabase.storage
        .from('metadata')
        .upload(imageFilePath, file!)

      if (imageUploadError) {
        console.error('Error uploading image:', imageUploadError)
        return {
          data: null,
          error: imageUploadError,
        }
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

      const { error: jsonUploadError } = await supabase.storage
        .from('metadata')
        .upload(
          jsonFilePath,
          new Blob([JSON.stringify(ticketData)], { type: 'application/json' }),
          { contentType: 'application/json' },
        )

      if (jsonUploadError) {
        console.error('Error uploading JSON:', jsonUploadError)
        return {
          data: null,
          error: jsonUploadError,
        }
      }

      const {
        data: { publicUrl: jsonPublicUrl },
      } = supabase.storage.from('metadata').getPublicUrl(jsonFilePath)

      console.log('jsonPublicUrl', jsonPublicUrl)

      return {
        data: {
          ticketId,
          ticketImageUrl: imagePublicUrl,
          metadataURI: jsonPublicUrl,
        },
        error: null,
      }
    } catch (e) {
      console.log('e', e)
      return {
        data: null,
        error: e,
      }
    }
  }

  return (
    <Stack as='form' onSubmit={handleSubmit(onSubmit)} p={4} spacing={4}>
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

      <FormControl isInvalid={!!errors.fee}>
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

      <FormControl isInvalid={!!errors.maxParticipants}>
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

      <FormControl isInvalid={!!errors.participantType}>
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

      <FormControl isInvalid={!!errors.requireSignature}>
        <FormLabel>
          購入に条件を追加する
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

      {requireSignature && (
        <>
          <Select {...register('ruleType')}>
            <option value='allowlist'>Allowlist</option>
            <option value='code'>Code</option>
            <option value='nft'>NFT</option>
          </Select>

          <Input
            {...register('ruleValue')}
            placeholder={
              ruleType === 'code'
                ? 'Enter a value'
                : 'Enter values separated by comma'
            }
          />
        </>
      )}

      <FormControl isInvalid={!!errors.img}>
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
                handleImageChange(e)
                onChange(e)
              }}
            />
          )}
        />
        {ticketImage && (
          <Image
            src={URL.createObjectURL(ticketImage)}
            alt='選択された画像'
            width='100%'
            height='100%'
            objectFit='cover'
          />
        )}
      </FormControl>

      <Button colorScheme='blue' type='submit' isLoading={isSubmitting}>
        Submit
      </Button>
    </Stack>
  )
}
