import {v4} from "uuid";

let channelCnt = 0
let pcCnt = 0

export class Channel{
    id: string
    cnt: number = channelCnt++
    sender: {
        pcCnt: number,
        pc: RTCPeerConnection,
        locationId: string,
    }|null = null
    receivers: {
        pcCnt: number,
        pc: RTCPeerConnection,
        locationId: string,
        offer: RTCSessionDescription,
        answer: RTCSessionDescription
    }[] = []
    constructor(channelId: string) {
        this.id = channelId
    }
    setSender(pc:RTCPeerConnection){
        const locationId = v4()
        const oldSender = this.sender
        this.sender = {
            pcCnt: pcCnt++,
            pc,
            locationId,
        }
        if (oldSender) {
            console.log(`Replace UP#${this.sender.pcCnt}\t${this.id}\tOLD:#${oldSender.pcCnt}`)
            oldSender.pc.close()
        } else {
            console.log(`NEW     UP#${this.sender.pcCnt}\t${this.id}`)
        }
        return locationId
    }
}
