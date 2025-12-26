import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import clsx from 'clsx'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Container } from '@/components/Container'
import {
  GitHubIcon,
  InstagramIcon,
  LinkedInIcon,
  TwitterIcon,
} from '@/components/SocialIcons'
import publicis from '@/images/logos/publicis.jpeg'
import cognizant from '@/images/logos/cognizant.jpeg'
import bits from '@/images/logos/bits.jpeg'
import Kuk from '@/images/logos/Kuk.jpeg'
import tech9 from '@/images/logos/tech9.png'
import { formatDate } from '@/lib/formatDate'
import { generateRssFeed } from '@/lib/generateRssFeed'
import { getAllArticles } from '@/lib/getAllArticles'

function MailIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M2.75 7.75a3 3 0 0 1 3-3h12.5a3 3 0 0 1 3 3v8.5a3 3 0 0 1-3 3H5.75a3 3 0 0 1-3-3v-8.5Z"
        className="fill-zinc-100 stroke-zinc-400 dark:fill-zinc-100/10 dark:stroke-zinc-500"
      />
      <path
        d="m4 6 6.024 5.479a2.915 2.915 0 0 0 3.952 0L20 6"
        className="stroke-zinc-400 dark:stroke-zinc-500"
      />
    </svg>
  )
}

function BriefcaseIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M2.75 9.75a3 3 0 0 1 3-3h12.5a3 3 0 0 1 3 3v8.5a3 3 0 0 1-3 3H5.75a3 3 0 0 1-3-3v-8.5Z"
        className="fill-zinc-100 stroke-zinc-400 dark:fill-zinc-100/10 dark:stroke-zinc-500"
      />
      <path
        d="M3 14.25h6.249c.484 0 .952-.002 1.316.319l.777.682a.996.996 0 0 0 1.316 0l.777-.682c.364-.32.832-.319 1.316-.319H21M8.75 6.5V4.75a2 2 0 0 1 2-2h2.5a2 2 0 0 1 2 2V6.5"
        className="stroke-zinc-400 dark:stroke-zinc-500"
      />
    </svg>
  )
}

function AcademicIcon(props) {
  return (
    <svg
     viewBox="0 0 52 52"
      fill="none"
       stroke-width="1.5"
        stroke-linecap="round"
         stroke-linejoin="round"
          aria-hidden="true"
           class="h-6 w-6 flex-none"
           ><g>
           <path class="fill-zinc-100 stroke-zinc-500 dark:fill-zinc-100/10 dark:stroke-zinc-100" d="M25.8,26.7c-1.2,0.1-2.3-0.4-3.5-0.8c-6.3-2.1-12.7-4.2-19-6.3c-0.4-0.2-0.7-0.3-1-0.6 c-0.4-0.3-0.4-0.7,0-1c0.3-0.2,0.7-0.5,1.1-0.6c6.8-2,13.5-4,20.3-6.1c1.5-0.5,3.1-0.5,4.7,0c6.7,2,13.4,4,20.1,6 c0.4,0.2,0.8,0.3,1.2,0.6c0.5,0.3,0.5,0.8,0,1.1c-0.3,0.2-0.6,0.4-1,0.5C42,21.7,35.3,24,28.5,26.2C27.6,26.6,26.8,26.7,25.8,26.7z "></path>
           <path class="fill-zinc-100 stroke-zinc-500 dark:fill-zinc-100/10 dark:stroke-zinc-100" d="M12.5,27c-1-0.2-1.2,0.4-1.2,0.9c0,2.6,0,5.1,0,7.6c0,0.9,0.3,1.4,0.9,2c0.2,0.2,0.5,0.4,0.7,0.6 c1.6,1.1,3.5,1.8,5.4,2.3c3.8,1,7.6,1.2,11.5,0.7c2.5-0.3,5-1,7.3-2c1-0.5,2-1,2.7-1.8c0.5-0.5,0.7-1,0.6-1.7 c0.1-2.4,0.1-4.9,0.1-7.4c0-1.4-1-1.2-1.4-1.1c-3.5,1.2-7.2,2.3-10.7,3.5c-1.8,0.6-3.5,0.6-5.2,0L12.5,27z"></path>
           <path class="fill-zinc-100 stroke-zinc-500 dark:fill-zinc-100/10 dark:stroke-zinc-100" d="M45.9,24.7c-0.3,0.1-0.4,0.2-0.4,0.6c0,2.3,0,4.5,0,6.8c0,0.2-0.1,0.5-0.2,0.7c-0.5,1.2-1,2.4-1.4,3.6 c-0.4,1.1-0.2,2.3,0.6,3.1c0.2,0.3,0.6,0.6,0.9,0.8c0.3,0.3,0.8,0.4,1.2,0.5c0.7,0.1,1.3-0.3,1.8-0.7c0.2-0.2,0.5-0.4,0.7-0.7 c0.6-0.8,0.7-1.8,0.5-2.7c-0.3-1.4-0.9-2.6-1.5-3.8c-0.2-0.2-0.2-0.6-0.2-0.8c0-2.5,0-4.9,0-7.4c0-0.5-0.4-0.4-0.6-0.3L45.9,24.7z"></path>
           </g>
           </svg>
  )
}

function ArrowDownIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4.75 8.75 8 12.25m0 0 3.25-3.5M8 12.25v-8.5"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Article({ article }) {
  return (
    <Card as="article">
      <Card.Title href={`/articles/${article.slug}`}>
        {article.title}
      </Card.Title>
      <Card.Eyebrow as="time" dateTime={article.date} decorate>
        {formatDate(article.date)}
      </Card.Eyebrow>
      <Card.Description>{article.description}</Card.Description>
      <Card.Cta>Read article</Card.Cta>
    </Card>
  )
}

function SocialLink({ icon: Icon, ...props }) {
  return (
    <Link className="group -m-1 p-1" {...props}>
      <Icon className="h-6 w-6 fill-zinc-500 transition group-hover:fill-zinc-600 dark:fill-zinc-400 dark:group-hover:fill-zinc-300" />
    </Link>
  )
}

function Newsletter() {
  return (
    <form
      action="/thank-you"
      className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40"
    >
      <h2 className="flex text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        <MailIcon className="h-6 w-6 flex-none" />
        <span className="ml-3">Stay up to date</span>
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Get notified when I publish something new, and unsubscribe at any time.
      </p>
      <div className="mt-6 flex">
        <input
          type="email"
          placeholder="Email address"
          aria-label="Email address"
          required
          className="min-w-0 flex-auto appearance-none rounded-md border border-zinc-900/10 bg-white px-3 py-[calc(theme(spacing.2)-1px)] shadow-md shadow-zinc-800/5 placeholder:text-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 dark:border-zinc-700 dark:bg-zinc-700/[0.15] dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-teal-400 dark:focus:ring-teal-400/10 sm:text-sm"
        />
        <Button type="submit" className="ml-4 flex-none">
          Join
        </Button>
      </div>
    </form>
  )
}

function Academic() {
  let academic = [
    {
      institute: 'Birla Institute of Technology & Sciences, Pilani',
      title: 'M.Tech, Data Science & Engineering',
      logo: bits,
      start: '2022',
      end: {
        label: 'Present',
        dateTime: new Date().getFullYear(),
      },
    },
    {
      institute: 'Kurushetra University, Kurukshetra',
      title: 'B.Tech, Computer Science & Engineering',
      logo: Kuk,
      start: '2009',
      end: '2013',
    },
  ]
  return (
    <div className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40">
      <h2 className="flex text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        <AcademicIcon className="h-6 w-6 flex-none" />
        <span className="ml-3">Education</span>
      </h2>
      <ol className="mt-6 space-y-4">
        {academic.map((role, roleIndex) => (
          <li key={roleIndex} className="flex gap-4">
            <div className="relative mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-full shadow-md shadow-zinc-800/5 ring-1 ring-zinc-900/5 dark:border dark:border-zinc-700/50 dark:bg-zinc-800 dark:ring-0">
              <Image src={role.logo} alt="" className="h-7 w-7" unoptimized />
            </div>
            <dl className="flex flex-auto flex-wrap gap-x-2">
              <dt className="sr-only">Institute</dt>
              <dd className="w-full flex-none text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {role.institute}
              </dd>
              <dt className="sr-only">Role</dt>
              <dd className="text-xs text-zinc-500 dark:text-zinc-400">
                {role.title}
              </dd>
              <dt className="sr-only">Date</dt>
              <dd
                className="ml-auto text-xs text-zinc-400 dark:text-zinc-500"
                aria-label={`${role.start.label ?? role.start} until ${
                  role.end.label ?? role.end
                }`}
              >
                <time dateTime={role.start.dateTime ?? role.start}>
                  {role.start.label ?? role.start}
                </time>{' '}
                <span aria-hidden="true">—</span>{' '}
                <time dateTime={role.end.dateTime ?? role.end}>
                  {role.end.label ?? role.end}
                </time>
              </dd>
            </dl>
          </li>
        ))}
      </ol>
    
    </div>
  )
}

function Resume() {
  let resume = [
    {
      company: 'Tech9',
      title: 'Sr. Software Engineer',
      logo: tech9,
      start: '2018',
      end: {
        label: 'Present',
        dateTime: new Date().getFullYear(),
      },
    },
    {
      company: 'Publicis Sapient',
      title: 'Associate Experience Technology',
      logo: publicis,
      start: '2016',
      end: '2018',
    },
    {
      company: 'Cognizant',
      title: 'UI Developer',
      logo: cognizant,
      start: '2014',
      end: '2016',
    },

  ]

  return (
    <div className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40">
      <h2 className="flex text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        <BriefcaseIcon className="h-6 w-6 flex-none" />
        <span className="ml-3">Work</span>
      </h2>
      <ol className="mt-6 space-y-4">
        {resume.map((role, roleIndex) => (
          <li key={roleIndex} className="flex gap-4">
            <div className="relative mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-full shadow-md shadow-zinc-800/5 ring-1 ring-zinc-900/5 dark:border dark:border-zinc-700/50 dark:bg-zinc-800 dark:ring-0">
              <Image src={role.logo} alt="" className="h-7 w-7" unoptimized />
            </div>
            <dl className="flex flex-auto flex-wrap gap-x-2">
              <dt className="sr-only">Company</dt>
              <dd className="w-full flex-none text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {role.company}
              </dd>
              <dt className="sr-only">Role</dt>
              <dd className="text-xs text-zinc-500 dark:text-zinc-400">
                {role.title}
              </dd>
              <dt className="sr-only">Date</dt>
              <dd
                className="ml-auto text-xs text-zinc-400 dark:text-zinc-500"
                aria-label={`${role.start.label ?? role.start} until ${
                  role.end.label ?? role.end
                }`}
              >
                <time dateTime={role.start.dateTime ?? role.start}>
                  {role.start.label ?? role.start}
                </time>{' '}
                <span aria-hidden="true">—</span>{' '}
                <time dateTime={role.end.dateTime ?? role.end}>
                  {role.end.label ?? role.end}
                </time>
              </dd>
            </dl>
          </li>
        ))}
      </ol>
      <Button href="https://drive.google.com/file/d/1k5WoN28fmPrzvkxj1anpVKZOSIFWI0EY/view?usp=sharing" variant="secondary" className="group mt-6 w-full">
        Download CV
        <ArrowDownIcon className="h-4 w-4 stroke-zinc-400 transition group-active:stroke-zinc-600 dark:group-hover:stroke-zinc-50 dark:group-active:stroke-zinc-50" />
      </Button>
    </div>
  )
}


export default function Home({ articles }) {
  return (
    <>
      <Head>
        <title>
          Nitish Kalra - Software Developer, Avid Reader, Mythological Addiction. 
        </title>
        <meta
          name="description"
          content="Greetings, my name is Nitish, a proficient software developer located in New Delhi, India. With nearly a decade of hands-on experience, my forte lies in architecting both dynamic and static web pages, with a comprehensive understanding of the entire web development cycle - from planning and designing to building and testing. I am well-versed in the principles of agile methodology and have cultivated expertise in a variety of programming languages and technologies including JavaScript (JS), React, Next.js, GraphQL, Node.js, Go, and Python."
        />
      </Head>
      <Container className="mt-9">
        <div className="max-w-8xl">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
          Software Developer, Avid Reader, Mythologically Addicted, Pre-Historic Reader.
          </h1>
          <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
          Greetings, my name is Nitish, a proficient software developer located in New Delhi, India. With nearly a decade of hands-on experience, my forte lies in architecting both dynamic and static web pages, with a comprehensive understanding of the entire web development cycle - from planning and designing to building and testing. I am well-versed in the principles of agile methodology and have cultivated expertise in a variety of programming languages and technologies including JavaScript (JS), React, Next.js, GraphQL, Node.js, Go, and Python.
          </p>
          <div className="mt-6 flex gap-6">
            <SocialLink
              href="https://twitter.com/4561Nitish"
              aria-label="Follow on Twitter"
              icon={TwitterIcon}
            />
            <SocialLink
            href="https://instagram.com/nitish._kalra._"
              aria-label="Follow on Instagram"
              icon={InstagramIcon}
            />
            <SocialLink
              href="https://github.com/kalra-nitish"
              aria-label="Follow on GitHub"
              icon={GitHubIcon}
            />
            <SocialLink
              href="https://linkedin.com/in/nitishkalra-uiaspects/"
              aria-label="Follow on LinkedIn"
              icon={LinkedInIcon}
            />
          </div>
        </div>
      </Container>
      <Container className="mt-24 md:mt-28">
        <div className="mx-auto grid max-w-xl grid-cols-1 gap-y-20 lg:max-w-none lg:grid-cols-2">
          <div className="flex flex-col gap-16">
            {articles.map((article) => (
              <Article key={article.slug} article={article} />
            ))}
          </div>
          <div className="space-y-10 xl:pl-16">
            <Academic/>
            <Resume />
          </div>
        </div>
      </Container>
    </>
  )
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === 'production') {
    await generateRssFeed()
  }

  return {
    props: {
      articles: (await getAllArticles())
        .slice(0, 4)
        .map(({ component, ...meta }) => meta),
    },
  }
}
