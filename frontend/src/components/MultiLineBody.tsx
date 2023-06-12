import React from 'react'

export interface MultiLineBodyProps {
  /**
   * MultiLineBody body
   */
  body: string

  /**
   * Convert text to link flag
   */
  textToLink?: boolean
}

const toLinkRegex = /((?:https?|ftp):\/\/[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+)/u
const replaceValue = '<a href="$1" target="_blank">$1</a>'

export const MultiLineBody = ({
  body,
  textToLink = true,
}: MultiLineBodyProps) => {
  const bodyArray = (
    textToLink && toLinkRegex.test(body)
      ? body.replace(toLinkRegex, replaceValue)
      : body
  ).split('\n')

  const texts = bodyArray
    .map((text, index) => {
      if (textToLink && toLinkRegex.test(text)) {
        return (
          <span
            key={index}
            dangerouslySetInnerHTML={{
              __html: text,
            }}
          ></span>
        )
      }
      return <React.Fragment key={index}>{text}</React.Fragment>
    })
    .map((text, index) => (
      <React.Fragment key={index}>
        {text}
        {index !== bodyArray.length - 1 && <br />}
      </React.Fragment>
    ))

  return <>{texts}</>
}
