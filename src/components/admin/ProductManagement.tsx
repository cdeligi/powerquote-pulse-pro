
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Level1ProductForm } from "./product-forms/Level1ProductForm";
import { ChassisForm } from "./product-forms/ChassisForm";
import { CardForm } from "./product-forms/CardForm";
import { Level2OptionForm } from "./product-forms/Level2OptionForm";
import { Level4ConfigurationManager } from "./Level4ConfigurationManager";
import { Level1Product, Level2Product, Level3Product, Level4Product } from "@/types/product";
import { productDataService } from "@/services/productDataService";
import { useToast } from "@/hooks/use-toast";

export const ProductManagement = () => {
  const { toast } = useToast();

  const handleLevel1Save = async (productData: Omit<Level1Product, 'id'> | Level1Product) => {
    try {
      if ('id' in productData) {
        await productDataService.updateLevel1Product(productData.id, productData);
        toast({ title: "Success", description: "Level 1 product updated successfully" });
      } else {
        await productDataService.createLevel1Product(productData);
        toast({ title: "Success", description: "Level 1 product created successfully" });
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to save Level 1 product", 
        variant: "destructive" 
      });
    }
  };

  const handleLevel2Save = async (productData: Omit<Level2Product, 'id'> | Level2Product) => {
    try {
      if ('id' in productData) {
        await productDataService.updateLevel2Product(productData.id, productData);
        toast({ title: "Success", description: "Level 2 product updated successfully" });
      } else {
        await productDataService.createLevel2Product(productData);
        toast({ title: "Success", description: "Level 2 product created successfully" });
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to save Level 2 product", 
        variant: "destructive" 
      });
    }
  };

  const handleLevel3Save = async (productData: Omit<Level3Product, 'id'> | Level3Product) => {
    try {
      if ('id' in productData) {
        await productDataService.updateLevel3Product(productData.id, productData);
        toast({ title: "Success", description: "Level 3 product updated successfully" });
      } else {
        await productDataService.createLevel3Product(productData);
        toast({ title: "Success", description: "Level 3 product created successfully" });
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to save Level 3 product", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Product Management</h2>
        <p className="text-muted-foreground">
          Manage your product hierarchy and configurations across all levels.
        </p>
      </div>

      <Tabs defaultValue="level1" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="level1">Level 1 Products</TabsTrigger>
          <TabsTrigger value="level2">Level 2 Products</TabsTrigger>
          <TabsTrigger value="level3">Level 3 Products</TabsTrigger>
          <TabsTrigger value="level4">Level 4 Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="level1" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Level 1 Products</CardTitle>
              <CardDescription>
                Main product categories (QTMS, TM8, TM3, etc.). These are the top-level products in your hierarchy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Level1ProductForm onSave={handleLevel1Save} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="level2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Level 2 Products</CardTitle>
              <CardDescription>
                Product variants and chassis (LTX, MTX, STX for QTMS). These are linked to Level 1 products.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChassisForm onSave={handleLevel2Save} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="level3" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Level 3 Products</CardTitle>
              <CardDescription>
                Components, cards, and options. These are the specific parts that go into Level 2 products.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4">Cards & Components</h4>
                  <CardForm onSave={handleLevel3Save} />
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Product Options</h4>
                  <Level2OptionForm onSave={handleLevel3Save} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="level4" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Level 4 Configuration</CardTitle>
              <CardDescription>
                Product-specific configurations tied to Level 3 products. Create dropdown selections or multi-line configurations for your products.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Level4ConfigurationManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
