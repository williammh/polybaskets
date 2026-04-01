import { use } from "react"
import { UserProfile } from "@/components/user-profile"

interface UserPageProps {
  params: Promise<{
    userId: string
  }>
}

export default function UserPage({ params }: UserPageProps) {
  const { userId } = use(params)

  return <UserProfile userId={userId} />
}
