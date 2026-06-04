package com.triplixtech.saas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class PhonePeService {

    @Value("${phonepe.merchant.id:PGPLAYMERCHANT}")
    private String merchantId;

    @Value("${phonepe.salt.key:099eb0cd-02cf-4e2a-8aca-3e6c6aff0399}")
    private String saltKey;

    @Value("${phonepe.salt.index:1}")
    private String saltIndex;

    @Value("${phonepe.api.url:https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay}")
    private String apiUrl;

    @Value("${phonepe.status.url:https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status}")
    private String statusUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 1. Generate check sum SHA-256 signature
    public String calculateChecksum(String base64Payload, String endpoint) {
        String baseString = base64Payload + endpoint + saltKey;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(baseString.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString() + "###" + saltIndex;
        } catch (Exception ex) {
            throw new RuntimeException("SHA256 signature calculation failed", ex);
        }
    }

    // 2. Initiate Payment Request with PhonePe API
    public String initiatePayment(Long paymentId, double amount, String callbackUrl) {
        try {
            // Convert amount to paise (1 INR = 100 paise).
            // Assume the input is USD or INR. If USD, convert to INR at a rate of 80 INR/USD.
            long amountInPaise = Math.round(amount * 100);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("merchantId", merchantId);
            requestBody.put("merchantTransactionId", "TXN-" + paymentId + "-" + System.currentTimeMillis());
            requestBody.put("merchantUserId", "USER-" + System.currentTimeMillis());
            requestBody.put("amount", amountInPaise);
            requestBody.put("redirectUrl", callbackUrl);
            requestBody.put("redirectMode", "POST");
            requestBody.put("callbackUrl", callbackUrl);
            
            Map<String, Object> paymentInstrument = new HashMap<>();
            paymentInstrument.put("type", "PAY_PAGE");
            requestBody.put("paymentInstrument", paymentInstrument);

            // Convert to JSON and Base64-encode
            String jsonPayload = objectMapper.writeValueAsString(requestBody);
            String base64Payload = Base64.getEncoder().encodeToString(jsonPayload.getBytes(StandardCharsets.UTF_8));

            // Calculate checksum
            String checksum = calculateChecksum(base64Payload, "/pg/v1/pay");

            // Build request headers & wrapper payload
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-VERIFY", checksum);

            Map<String, String> postPayload = new HashMap<>();
            postPayload.put("request", base64Payload);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(postPayload, headers);

            // Invoke API POST
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                if (Boolean.TRUE.equals(body.get("success"))) {
                    Map<String, Object> data = (Map<String, Object>) body.get("data");
                    Map<String, Object> instrumentResponse = (Map<String, Object>) data.get("instrumentResponse");
                    Map<String, Object> redirectInfo = (Map<String, Object>) instrumentResponse.get("redirectInfo");
                    return (String) redirectInfo.get("url");
                } else {
                    throw new RuntimeException("PhonePe payment initiation failed: " + body.get("message"));
                }
            } else {
                throw new RuntimeException("PhonePe initiation failed. Status: " + response.getStatusCode());
            }

        } catch (Exception ex) {
            throw new RuntimeException("PhonePe payment initiation process encountered error: " + ex.getMessage(), ex);
        }
    }

    // 3. Verify Payment Status callback checksum
    public boolean verifyCallbackChecksum(String responseBase64, String verifyHeader) {
        String calculated = calculateChecksum(responseBase64, ""); // Webhooks check without endpoints
        // Extract checksum parts to compare
        if (verifyHeader == null) return false;
        String checksumVal = verifyHeader.split("###")[0];
        String calculatedVal = calculated.split("###")[0];
        return checksumVal.equalsIgnoreCase(calculatedVal);
    }
}
