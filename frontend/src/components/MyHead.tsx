import Head from 'next/head'

type MyHeadProps = {
  title?: string
}

export const MyHead = ({ title }: MyHeadProps) => {
  const baseTitle = 'thirdevent'
  const t = title ? `${title} - ${baseTitle}` : baseTitle
  return (
    <Head>
      <title>{t}</title>
      <meta
        name='description'
        content={'NFTを活用したイベント開催プラットフォーム'}
      />
      <meta name='viewport' content='width=device-width, initial-scale=1' />
      <link rel='icon' href='/favicon.ico' />
    </Head>
  )
}
