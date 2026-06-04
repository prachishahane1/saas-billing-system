package com.triplixtech.saas.controller;

import com.triplixtech.saas.entity.Payment;
import com.triplixtech.saas.service.PaymentService;
import com.triplixtech.saas.service.PhonePeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/phonepe")
public class PhonePeController {

    @Autowired
    private PhonePeService phonePeService;

    @Autowired
    private PaymentService paymentService;

    // 1. Trigger Payment Page Redirection
    @PostMapping("/pay")
    public ResponseEntity<?> pay(@RequestParam Long paymentId) {
        try {
            Payment payment = paymentService.getById(paymentId);
            
            // Check status is pending
            if (!"PENDING".equals(payment.getStatus())) {
                return ResponseEntity.badRequest().body("Payment is already processed with status: " + payment.getStatus());
            }

            // Callback URL back to our backend
            String callbackUrl = "http://localhost:8080/phonepe/callback";

            // Initiate payment with PhonePe API and get redirection URL
            String redirectUrl = phonePeService.initiatePayment(paymentId, payment.getAmount(), callbackUrl);

            Map<String, String> response = new HashMap<>();
            response.put("redirectUrl", redirectUrl);
            return ResponseEntity.ok(response);

        } catch (Exception ex) {
            return ResponseEntity.status(500).body("Error starting PhonePe checkout: " + ex.getMessage());
        }
    }

    // 2. Callback redirect endpoint mapping (PhonePe returns user via POST)
    @PostMapping("/callback")
    @ResponseBody
    public String callback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "transactionId", required = false) String transactionId,
            @RequestParam(value = "merchantId", required = false) String merchantId,
            @RequestParam(value = "providerReferenceId", required = false) String providerReferenceId,
            @RequestParam(value = "amount", required = false) Long amount,
            @RequestParam(value = "checksum", required = false) String checksum) {

        boolean isSuccess = "PAYMENT_SUCCESS".equalsIgnoreCase(code);
        Long paymentId = null;

        if (transactionId != null) {
            try {
                String[] parts = transactionId.split("-");
                if (parts.length > 1) {
                    paymentId = Long.parseLong(parts[1]);
                }
            } catch (Exception ex) {
                System.out.println("Error parsing transaction ID: " + transactionId);
            }
        }

        if (paymentId != null) {
            try {
                if (isSuccess) {
                    paymentService.completePayment(paymentId);
                } else {
                    paymentService.failPayment(paymentId, "PhonePe failed status: " + code);
                }
            } catch (Exception ex) {
                System.out.println("Error updating payment " + paymentId + ": " + ex.getMessage());
            }
        }

        // Return a sleek redirect page back to dashboard
        String statusMessage = isSuccess ? "Payment Successful!" : "Payment Failed";
        String statusColor = isSuccess ? "#10b981" : "#f43f5e";
        String statusIcon = isSuccess ? "fa-circle-check" : "fa-circle-xmark";

        return "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "    <title>PhonePe Payment Callback</title>\n" +
                "    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n" +
                "    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n" +
                "    <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap\" rel=\"stylesheet\">\n" +
                "    <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css\">\n" +
                "    <style>\n" +
                "        body { background-color: #0b0f19; color: #f3f4f6; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }\n" +
                "        .container { text-align: center; background-color: #121824; padding: 3rem; border-radius: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.08); max-width: 400px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }\n" +
                "        .icon { font-size: 4rem; color: " + statusColor + "; margin-bottom: 1.5rem; }\n" +
                "        h2 { margin: 0 0 0.5rem 0; font-weight: 600; }\n" +
                "        p { color: #9ca3af; margin: 0 0 2rem 0; font-size: 0.875rem; }\n" +
                "        .btn { display: inline-block; padding: 0.625rem 1.5rem; background-color: #6366f1; color: white; text-decoration: none; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 500; transition: background 0.2s; }\n" +
                "        .btn:hover { background-color: #4f46e5; }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"container\">\n" +
                "        <div class=\"icon\"><i class=\"fa-solid " + statusIcon + "\"></i></div>\n" +
                "        <h2>" + statusMessage + "</h2>\n" +
                "        <p>Transaction reference: " + (transactionId != null ? transactionId : "N/A") + "</p>\n" +
                "        <p>Redirecting you back to your dashboard in 3 seconds...</p>\n" +
                "        <a href=\"/index.html\" class=\"btn\">Back to Dashboard</a>\n" +
                "    </div>\n" +
                "    <script>\n" +
                "        setTimeout(function() {\n" +
                "            window.location.href = \"/index.html\";\n" +
                "        }, 3000);\n" +
                "    </script>\n" +
                "</body>\n" +
                "</html>";
    }
}
