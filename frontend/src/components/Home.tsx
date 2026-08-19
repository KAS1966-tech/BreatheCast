import { useAppSelector } from "../app/redux"

const Home = () => {
    const {user} = useAppSelector((state)=> state.auth)
    return (
        <div>
            <h1>Welcome {user?.fullname}</h1>
        </div>
    )
}

export default Home
