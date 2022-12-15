// let endpoint = `https://localhost.wrtc.dev:4000`
let endpoint = `https://whip.dev.eyevinn.technology/api/v1/whip/broadcaster`

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

const initMediaStream = async ()=>{
    rtc.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    })
    rtc.audio.track = rtc.mediaStream.getAudioTracks()[0]
    rtc.video.track = rtc.mediaStream.getVideoTracks()[0]
    if (rtc.audio.track){
        rtc.audio.transceiver.sender.replaceTrack(rtc.audio.track)
    }
    if (rtc.video.track){
        rtc.video.transceiver.sender.replaceTrack(rtc.video.track)
    }
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
    document.getElementById('video').srcObject = rtc.mediaStream
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
    rtc.audio.transceiver = rtc.peerConnection.addTransceiver('audio', {
        direction: 'sendonly'
    })
    rtc.video.transceiver = rtc.peerConnection.addTransceiver('video', {
        direction: 'sendonly'
    })
}

const startCamera = async ()=>{
    initPC()
    await Promise.all([createResource(), initMediaStream()])
}

const main = async ()=>{
    document.getElementById('endpoint').value = endpoint
    document.getElementById('start-camera').onclick = startCamera
}

main()
