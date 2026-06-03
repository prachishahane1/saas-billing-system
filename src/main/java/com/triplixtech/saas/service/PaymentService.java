package com.triplixtech.saas.service;

import com.triplixtech.saas.entity.Payment;
import com.triplixtech.saas.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    public Payment savePayment(Payment payment){
        return paymentRepository.save(payment);
    }

    public List<Payment> getAll(){
        return paymentRepository.findAll();
    }

    public List<Payment> getBySubscription(Long subId){
        return paymentRepository.findBySubscription_SubscriptionId(subId);
    }

    public Payment getById(Long id){
        return paymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment not found"));
    }
}