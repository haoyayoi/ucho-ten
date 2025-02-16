'use client'

import {
  Button,
  Card,
  Col,
  Loading,
  Row,
  Spacer,
  Text,
  User,
} from '@nextui-org/react'
import { NextPage } from 'next'
import { TimelineView } from '@/components/TimelineView'
import {
  TimelineFetcher,
  useTimelineView,
} from '@/components/TimelineView/useTimelineView'
import { MainLayout } from '@/layouts/Main'
import { useRequiredSession } from '@/lib/hooks/useRequiredSession'
import React, { useCallback, useEffect, useState } from 'react'
import { ProfileViewDetailed } from '@atproto/api/dist/client/types/app/bsky/actor/defs'
import reactStringReplace from 'react-string-replace'
import Link from 'next/link'
import Zoom from 'react-medium-image-zoom'
import { ProfileEditModal } from '@/components/ProfileEditModal'

/**
 * Home page.
 */
const ProfilePage = ({ params }: { params: { identifier: string } }) => {
  const { agent } = useRequiredSession()
  const [profile, setProfile] = useState<ProfileViewDetailed>()
  const [followHover, setFollowHover] = useState(false)
  const [isFollowing, setIsFollowing] = useState(!!profile?.viewer?.following)
  const [followLoading, setFollowLoading] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isLabeled, setIsLabeled] = useState(false)
  const [whatLabel, setWhatLabel] = useState('')
  const [isMe, setIsMe] = useState(false)
  const [show, setShow] = useState(true)
  const [profileEditModal, setProfileEditModal] = useState(false)

  const fetchTimeline: TimelineFetcher = ({ agent, cursor }) => {
    if (!agent) {
      return
    }

    return agent
      .getAuthorFeed({
        actor: params.identifier,
        cursor,
      })
      .then((result) => result.data)
  }

  const timeline = useTimelineView(fetchTimeline)

  const fetchProfile = useCallback(async () => {
    if (!agent) {
      return
    }

    try {
      const result = await agent.getProfile({
        actor: params.identifier,
      })

      if (
        result &&
        result.data &&
        result.data.labels &&
        result.data.labels.length > 0
      ) {
        setIsLabeled(true)
        setWhatLabel(result.data.labels[0].val)
      }

      if (result.data.did === agent.session!.did) {
        setIsMe(true)
      }
      setProfile(result.data)
      setIsFollowing(!!result.data?.viewer?.following)

      if (result.data.viewer?.muted) {
        setShow(false)
      }
    } catch (error) {
      setShow(false)
    }
  }, [agent, params.identifier])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (!agent) {
    return (
      <div
        style={{
          height: '100dvh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Loading size="lg" />
      </div>
    )
  }

  const handleFollowClick = async () => {
    if (!agent || followLoading) {
      return
    }

    const following = profile?.viewer?.following
    setFollowLoading(true)

    if (following) {
      setIsFollowing(false)
      await agent.deleteFollow(following)
    } else if (profile?.did) {
      setIsFollowing(true)
      await agent.follow(profile.did)
    }

    await fetchProfile()
    setFollowLoading(false)
  }

  const handleEditProfileClick = async () => {
    setProfileEditModal(true)
  }

  const newlineCodeToBr = (text: string) => {
    return text.split('\n').map((line, i) => (
      <p key={i}>
        {reactStringReplace(
          line,
          /(@[a-zA-Z0-9-.]+|https?:\/\/[a-zA-Z0-9-./?=_%&:]+)/g,
          (match, j) => {
            if (match.startsWith('@')) {
              let domain = match.substring(1) // remove "@" symbol from match
              if (domain.endsWith('.')) {
                domain = domain.slice(0, -1)
              }
              return (
                <Link key={j} href={`/profile/${domain}`}>
                  {match}
                </Link>
              )
            } else if (match.startsWith('http')) {
              let url = match
              if (url.endsWith('.')) {
                url = url.slice(0, -1)
              }
              return (
                <a key={j} href={url} target="_blank" rel="noopener noreferrer">
                  {match}
                </a>
              )
            } else if (match.startsWith('tw@')) {
              const domain = match.substring(3) // remove "tw@" symbol from match
              return (
                <a
                  key={j}
                  href={`https://twitter.com/${domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {match}
                </a>
              )
            }
          }
        )}
      </p>
    ))
  }

  if (!show) {
    return (
      <MainLayout>
        <div
          style={{
            height: '100dvh',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <Card css={{ my: '$10' }} variant="bordered">
            <Card.Image
              src={'/images/profileDefaultImage/defaultHeaderImage.png'}
            ></Card.Image>
            <Card.Header>User not found</Card.Header>
            <Card.Body>
              <Link href="/">
                <Button>Return to Home</Button>
              </Link>
            </Card.Body>
          </Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <ProfileEditModal
        open={profileEditModal}
        onClose={() => setProfileEditModal(false)}
        onSave={fetchProfile}
      />
      <TimelineView
        {...timeline}
        header={
          profile ? (
            <Card css={{ my: '$10' }} variant="bordered">
              {!profile.banner && (
                <Card.Image
                  src={'/images/profileDefaultImage/defaultHeaderImage.png'}
                ></Card.Image>
              )}
              {profile.banner && (
                <Zoom>
                  <Card.Image src={profile.banner} showSkeleton />
                </Zoom>
              )}
              <Card.Header css={{ px: 0, flexFlow: 'column' }}>
                <Row align="center" justify="space-between">
                  <Col>
                    <User
                      src={
                        profile.avatar
                          ? profile.avatar
                          : '/images/profileDefaultIcon/kkrn_icon_user_6.svg'
                      }
                      squared
                      size="xl"
                      name={profile.displayName}
                      description={`@${profile.handle}`}
                    />
                  </Col>
                  <Button
                    rounded
                    bordered={isFollowing}
                    color={
                      isMe
                        ? 'gradient'
                        : isFollowing && followHover
                        ? 'error'
                        : 'primary'
                    }
                    onMouseOver={() => setFollowHover(true)}
                    onMouseLeave={() => setFollowHover(false)}
                    onPress={isMe ? handleEditProfileClick : handleFollowClick}
                    style={{ marginRight: '12px' }}
                  >
                    {!isMe
                      ? isFollowing
                        ? followHover
                          ? 'UnFollow'
                          : 'Following'
                        : 'Follow'
                      : 'Edit Profile'}
                  </Button>
                </Row>
              </Card.Header>
              {profile.description && (
                <>
                  <Card.Divider />
                  <Card.Body>{newlineCodeToBr(profile.description)}</Card.Body>
                </>
              )}
            </Card>
          ) : (
            <div
              style={{
                height: '100dvh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Loading />
            </div>
          )
        }
      />
    </MainLayout>
  )
}

export default ProfilePage
