import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button, FormControl, FormLabel, Input, Stack } from '@chakra-ui/react'

const schema = z.object({
  address: z.string().nonempty({ message: 'Required' }),
})

export type FormData = z.infer<typeof schema>

type WithdrawFormProps = {
  onSubmitHandler: (address: string) => Promise<void>
}

export const WithdrawForm = ({ onSubmitHandler }: WithdrawFormProps) => {
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await onSubmitHandler(data.address)
    } catch (error) {
      console.log('error ', error)
    }
  }

  return (
    <Stack as='form' onSubmit={handleSubmit(onSubmit)} p={4} spacing={4}>
      <FormControl id='address'>
        <FormLabel>引き出しアドレス</FormLabel>
        <Input {...register('address')} />
        <span>{errors.address?.message}</span>
      </FormControl>

      <Button colorScheme='blue' type='submit' isLoading={isSubmitting}>
        引き出す
      </Button>
    </Stack>
  )
}
