package com.triplixtech.saas.controller;

import com.triplixtech.saas.entity.Payment;
import com.triplixtech.saas.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @PostMapping
    public Payment create(@RequestBody Payment payment){
        return paymentService.savePayment(payment);
    }

    @GetMapping
    public List<Payment> getAll(){
        return paymentService.getAll();
    }

    @GetMapping("/{id}")
    public Payment getById(@PathVariable Long id){
        return paymentService.getById(id);
    }

    @GetMapping("/subscription/{subId}")
    public List<Payment> getBySubscription(@PathVariable Long subId){
        return paymentService.getBySubscription(subId);
    }
}