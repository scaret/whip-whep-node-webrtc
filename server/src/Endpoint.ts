import {Channel} from "./Channel";

class Endpoint{
    channels: Channel[] = []
    getChannel(channelId: string){
        let channel = this.channels.find((item)=>{
            return item.id === channelId
        })
        // console.log(`getChannel ${channelId}`)
        if (!channel){
            channel = new Channel(channelId)
        }
        this.channels.push(channel)
        return channel
    }
}

export const endpoint = new Endpoint()
