let endpoint = `${window.location.origin}/whep`
// let endpoint = `https://whip.dev.eyevinn.technology/api/v1/whip/broadcaster`
// eyelynn link: https://web.whip.eyevinn.technology/

const rtc = {
    location: null,
    mediaStream: null,
    peerConnection: null,
    audio: {
        transceiver: null,
        track: null,
    },
    video: {
        transceiver: null,
        track: null
    },
    offer: null,
}

const updateEndpointUrl = ()=>{
    let domEndpointUrl = document.getElementById('endpoint').value
    let urlParts = domEndpointUrl.split('?')
    let searchParams = null
    if (urlParts[1]){
        searchParams = new URLSearchParams(urlParts[1])
    } else {
        searchParams = new URLSearchParams()
    }
    const channelId = document.getElementById('channelId').value
    if (channelId){
        searchParams.set('channelId', channelId)
    }
    const newEndpointUrl = `${urlParts[0]}${searchParams.toString() ? '?' :''}${searchParams.toString()}`
    if (endpoint !== newEndpointUrl){
        console.log(`updateEndpointUrl\n${endpoint}${newEndpointUrl}`)
        document.getElementById('endpoint').value = newEndpointUrl
        endpoint = newEndpointUrl
    }
}

const createResource = async ()=>{
    rtc.offer = await rtc.peerConnection.createOffer()
    console.log('offer', rtc.offer.sdp)

    // 不要await
    rtc.peerConnection.setLocalDescription(rtc.offer)

    updateEndpointUrl()
    const resp = await axios.post(endpoint, rtc.offer.sdp, {
        headers: {
            authorization: 'whipit!',
            'content-type': 'application/sdp'
        }
    })
    if (!resp.data || !resp.headers.location) {
        console.error('Invalid response', resp)
    }
    rtc.answer = new RTCSessionDescription({
        type: 'answer',
        sdp: resp.data
    })
    rtc.location = resp.headers.location
    if (resp.headers.link){
        rtc.links = resp.headers.link.split(', ')
    } else {
        rtc.links = []
    }
    rtc.peerConnection.setRemoteDescription(rtc.answer)
}

const resetEnv = ()=>{
    if (rtc.video.track){
        rtc.video.track.stop()
    }
    if (rtc.audio.track){
        rtc.audio.track.stop()
    }
}

const tempDiv = document.createElement('div')

const updateView = ()=>{
    if (rtc.links){
        let html = ''
        rtc.links.forEach((link)=>{
            tempDiv.innerText = link
            html += `<li>${tempDiv.innerHTML}</li>`
        })
        document.getElementById('links').innerHTML = html
    }
    if (rtc.location){
        document.getElementById('location').innerHTML = rtc.location
    }
}

const initPC = ()=>{
    rtc.peerConnection = new RTCPeerConnection()
    rtc.peerConnection.onconnectionstatechange = ()=>{
        console.log('rtc.peerConnection.onconnectionstatechange', rtc.peerConnection.connectionState)
        if (rtc.peerConnection.connectionState === 'failed'){
            resetEnv()
        }
    }
    rtc.peerConnection.onsignalingstatechange = ()=>{
        console.log('rtc.peerConnection.onsignalingstatechange', rtc.peerConnection.signalingState)
    }
    rtc.peerConnection.oniceconnectionstatechange = ()=>{
        console.log('rtc.peerConnection.oniceconnectionstatechange', rtc.peerConnection.iceConnectionState)
        if (rtc.peerConnection.iceConnectionState === 'connected'){
            updateView()
        } else if (rtc.peerConnection.iceConnectionState === 'failed'){
            resetEnv()
        }
    }
    document.getElementById('medias').innerHTML = ''
    const audioNum = parseInt(document.getElementById('audioNum').value)

    const videoNum = parseInt(document.getElementById('videoNum').value)
    for (let i = 0; i < videoNum; i++){
        const transceiver = rtc.peerConnection.addTransceiver('video', {
            direction: 'recvonly'
        })
        const videoElem =document.createElement('video')
        videoElem.style.width = '800px'
        videoElem.controls = true
        videoElem.playsInline = true
        videoElem.muted = true
        videoElem.autoplay = true
        videoElem.srcObject = new MediaStream([transceiver.receiver.track])
        document.getElementById('medias').appendChild(videoElem)
    }
    for (let i = 0; i <audioNum; i++){
        const transceiver = rtc.peerConnection.addTransceiver('audio', {
            direction: 'recvonly'
        })
        const audioElem =document.createElement('audio')
        audioElem.controls = true
        audioElem.srcObject = new MediaStream([transceiver.receiver.track])
        document.getElementById('medias').appendChild(audioElem)
    }
}

const startPull = async ()=>{
    initPC()
    await createResource()
}

const main = async ()=>{
    document.getElementById('endpoint').value = endpoint
    document.getElementById('start-pull').onclick = startPull
}

main()
