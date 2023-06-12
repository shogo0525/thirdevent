import React from 'react'
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

const schema = z.object({
  name: z.string(),
  fee: z.string(),
  maxParticipants: z.number().int().positive(),
  participantType: z.number().int(),
  requireSignature: z.boolean(),
})

export type FormData = z.infer<typeof schema>

type TicketFormProps = {
  onSubmitHandler: (data: FormData) => Promise<void>
}

export const TicketForm = ({ onSubmitHandler }: TicketFormProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: FormData) => {
    console.log(data)
    onSubmitHandler(data)
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

      <Button colorScheme='blue' mt={4} type='submit'>
        Submit
      </Button>
    </Box>
  )
}
