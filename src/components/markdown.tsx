import { type FC } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { cn } from '@/utils'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript'
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript'
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json'
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css'
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml'

export interface MarkdownProps {
  children?: string
  className?: string
}

const safeProtocol = /^(https?|ircs?|mailto|xmpp|data)$/i

/**
 * https://github.com/remarkjs/react-markdown/blob/baad6c53764e34c4ead41e2eaba176acfc87538a/lib/index.js#L293
 */
const urlTransform = (value: string) => {
  // Same as:
  // <https://github.com/micromark/micromark/blob/929275e/packages/micromark-util-sanitize-uri/dev/index.js#L34>
  // But without the `encode` part.
  const colon = value.indexOf(':')
  const questionMark = value.indexOf('?')
  const numberSign = value.indexOf('#')
  const slash = value.indexOf('/')

  if (
    // If there is no protocol, it’s relative.
    colon < 0 ||
    // If the first colon is after a `?`, `#`, or `/`, it’s not a protocol.
    (slash > -1 && colon > slash) ||
    (questionMark > -1 && colon > questionMark) ||
    (numberSign > -1 && colon > numberSign) ||
    // It is a protocol, it should be allowed.
    safeProtocol.test(value.slice(0, colon))
  ) {
    return value
  }

  return ''
}

// Register languages
SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('css', css)
SyntaxHighlighter.registerLanguage('xml', xml)
SyntaxHighlighter.registerLanguage('html', xml)
SyntaxHighlighter.registerLanguage('jsx', javascript)
SyntaxHighlighter.registerLanguage('tsx', typescript)

const Markdown: FC<MarkdownProps> = ({ children = '', className }) => {
  return (
    <div className={cn(className, 'prose prose-sm prose-slate break-words dark:text-slate-50')}>
      <ReactMarkdown
        urlTransform={urlTransform}
        components={{
          h1: ({ className, ...props }) => (
            <h1 className={cn('my-2 mt-0 font-semibold text-2xl dark:text-slate-50', className)} {...props} />
          ),
          h2: ({ className, ...props }) => (
            <h2 className={cn('mb-2 mt-0 font-semibold dark:text-slate-50', className)} {...props} />
          ),
          h3: ({ className, ...props }) => (
            <h3 className={cn('mb-2 mt-0 font-semibold dark:text-slate-50', className)} {...props} />
          ),
          h4: ({ className, ...props }) => (
            <h4 className={cn('mb-2 mt-0 font-semibold dark:text-slate-50', className)} {...props} />
          ),
          img: ({ className, alt, ...props }) => (
            <img className={cn('my-2 max-w-[100%] rounded', className)} alt={alt} {...props} />
          ),
          strong: ({ className, ...props }) => <strong className={cn('dark:text-slate-50', className)} {...props} />,
          a: ({ className, ...props }) => (
            <a
              className={cn('text-blue-500', className)}
              target={props.href || '_blank'}
              rel="noopener noreferrer"
              {...props}
            />
          ),
          ul: ({ className, ...props }) => {
            Reflect.deleteProperty(props, 'ordered')
            return <ul className={cn('text-sm [&:not([depth="0"])]:my-0 ', className)} {...props} />
          },
          input: ({ className, ...props }) => <input className={cn('my-0', className)} {...props} />,
          table: ({ className, ...props }) => (
            <div className="my-2 w-full">
              <ScrollArea scrollLock={false}>
                <table className={cn('my-0 w-full rounded-md', className)} {...props} />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          ),
          tr: ({ className, ...props }) => {
            return <tr className={cn('m-0 border-t p-0 even:bg-muted', className)} {...props} />
          },
          th: ({ className, ...props }) => {
            return (
              <th
                className={cn(
                  'border px-3 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right',
                  className
                )}
                {...props}
              />
            )
          },
          td: ({ className, ...props }) => {
            return (
              <td
                className={cn(
                  'border px-3 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right',
                  className
                )}
                {...props}
              />
            )
          },
          pre: ({ className, ...props }) => <pre className={cn('my-2', className)} {...props} />,
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const isInline = !match

            if (isInline) {
              return (
                <code
                  className={cn(
                    'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
                    className
                  )}
                  {...props}
                >
                  {children}
                </code>
              )
            }

            const codeString = String(children).replace(/\n$/, '')

            return (
              <ScrollArea className="overscroll-y-auto" scrollLock={false}>
                <SyntaxHighlighter
                  style={atomOneDark}
                  language={language || 'text'}
                  PreTag="div"
                  className={cn(
                    'rounded-md border bg-muted p-4 font-mono text-sm',
                    'dark:bg-slate-900 dark:border-slate-700',
                    className
                  )}
                >
                  {codeString}
                </SyntaxHighlighter>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )
          }
        }}
        remarkPlugins={[remarkGfm, remarkBreaks]}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

Markdown.displayName = 'Markdown'

export { Markdown }
