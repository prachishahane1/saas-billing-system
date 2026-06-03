package com.triplixtech.saas.controller;

import com.triplixtech.saas.entity.PaymentLog;
import com.triplixtech.saas.service.PaymentLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/payment-logs")
public class PaymentLogController {

    @Autowired
    private PaymentLogService paymentLogService;

    @PostMapping
    public PaymentLog create(@RequestBody PaymentLog log){
        return paymentLogService.saveLog(log);
    }

    @GetMapping
    public List<PaymentLog> getAll(){
        return paymentLogService.getAll();
    }

    @GetMapping("/payment/{paymentId}")
    public List<PaymentLog> getByPayment(@PathVariable Long paymentId){
        return paymentLogService.getByPayment(paymentId);
    }
}