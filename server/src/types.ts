export interface RTPMLineInfo{
    transceiver: RTCRtpTransceiver,
    kind: 'audio'|'video',
}

export interface DataMlineInfo{
    dataChannel: RTCDataChannel|null,
    subscribedTo: DataMlineInfo|null,
    consumers: DataMlineInfo[],
    kind: 'datachannel'
}
