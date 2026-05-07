/**
 * Tự động dò tìm địa chỉ IP LAN của máy tính đang chạy trình duyệt
 * Sử dụng kỹ thuật WebRTC candidate leakage (được coi là an toàn trong mạng nội bộ/localhost)
 */
export const getLocalIP = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const ips: string[] = [];
    const pc = new RTCPeerConnection({
        iceServers: []
    });

    // Tạo một data channel trống để kích hoạt ICE candidates
    pc.createDataChannel("");

    pc.onicecandidate = (e) => {
        if (!e.candidate) {
            // Đã tìm xong tất cả candidates
            // Ưu tiên IP dải 192.168.x.x, 10.x.x.x, 172.16-31.x.x, nhưng LỌC BỎ các IP kết thúc bằng .1 (Virtual Adapters)
            const validIps = ips.filter(ip => !ip.endsWith('.1'));
            
            // Sắp xếp ưu tiên: 192.168.x.x (Wi-Fi gia đình) -> 10.x.x.x (Công ty) -> 172.x.x.x (Mạng nội bộ khác)
            const sortedIps = validIps.sort((a, b) => {
                const priority = (ip: string) => {
                    if (ip.startsWith('192.168.')) return 1;
                    if (ip.startsWith('10.')) return 2;
                    if (ip.startsWith('172.')) return 3;
                    return 4;
                };
                return priority(a) - priority(b);
            });

            resolve(sortedIps[0] || ips[0] || null);
            pc.close();
            return;
        }

        // Parse IP từ candidate string
        const parts = e.candidate.candidate.split(' ');
        const ip = parts[4];
        if (ip && !ips.includes(ip) && !ip.endsWith('.local')) {
            ips.push(ip);
        }
    };

    pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(err => {
            console.error('WebRTC IP detection failed:', err);
            resolve(null);
        });

    // Timeout sau 2 giây nếu không tìm thấy gì
    setTimeout(() => {
        if (pc.signalingState !== 'closed') {
            pc.close();
            resolve(ips[0] || null);
        }
    }, 2000);
  });
};
